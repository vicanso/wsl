// Copyright 2019 tree xie
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package main

import (
	"net/http"
	"strings"
	"time"

	"github.com/dustin/go-humanize"
	warner "github.com/vicanso/count-warner"
	"github.com/vicanso/elton"
	bodyparser "github.com/vicanso/elton-body-parser"
	errorHandler "github.com/vicanso/elton-error-handler"
	etag "github.com/vicanso/elton-etag"
	fresh "github.com/vicanso/elton-fresh"
	recover "github.com/vicanso/elton-recover"
	responder "github.com/vicanso/elton-responder"
	routerLimiter "github.com/vicanso/elton-router-concurrent-limiter"
	stats "github.com/vicanso/elton-stats"

	"go.uber.org/zap"

	"github.com/vicanso/wsl/config"
	_ "github.com/vicanso/wsl/controller"
	"github.com/vicanso/wsl/cs"
	_ "github.com/vicanso/wsl/helper"
	"github.com/vicanso/wsl/log"
	"github.com/vicanso/wsl/middleware"
	"github.com/vicanso/wsl/router"
	_ "github.com/vicanso/wsl/schedule"
	"github.com/vicanso/wsl/service"
	"github.com/vicanso/wsl/util"
)

// 相关依赖服务的校验，主要是数据库等
func dependServiceCheck() (err error) {
	err = service.RedisPing()
	if err != nil {
		return
	}
	configSrv := new(service.ConfigurationSrv)
	err = configSrv.Refresh()
	if err != nil {
		return
	}
	return
}

func main() {
	logger := log.Default()
	d := elton.New()
	d.SignedKeys = service.GetSignedKeys()

	// 未处理的error才会触发
	// 如果1分钟出现超过5次未处理异常
	warnerException := warner.NewWarner(60*time.Second, 5)
	warnerException.ResetOnWarn = true
	warnerException.On(func(_ string, _ int64) {
		service.AlarmError("too many uncaught exception")
	})
	d.OnError(func(c *elton.Context, err error) {
		// 可以针对实际场景输出更多的日志信息
		logger.DPanic("exception",
			zap.String("ip", c.RealIP()),
			zap.String("uri", c.Request.RequestURI),
			zap.Error(err),
		)
		// TODO 邮件通知
		warnerException.Inc("exception", 1)
	})
	// 对于404的请求，不会执行中间件，一般都是因为攻击之类才会导致大量出现404，
	// 因此可在此处汇总出错IP，针对较频繁出错IP，增加告警信息
	// 如果1分钟同一个IP出现60次404
	warner404 := warner.NewWarner(60*time.Second, 60)
	warner404.ResetOnWarn = true
	warner404.On(func(ip string, createdAt int64) {
		service.AlarmError("too many 404 request, client ip:" + ip)
	})

	d.NotFoundHandler = func(resp http.ResponseWriter, req *http.Request) {
		ip := elton.GetRealIP(req)
		logger.Info("404",
			zap.String("ip", ip),
			zap.String("uri", req.RequestURI),
		)
		resp.Header().Set(elton.HeaderContentType, elton.MIMEApplicationJSON)
		resp.WriteHeader(http.StatusNotFound)
		resp.Write([]byte(`{"statusCode": 404,"message": "Not found"}`))
		warner404.Inc(ip, 1)
	}
	tcLang := "/" + cs.LangTC
	d.Pre(func(req *http.Request) {
		path := req.URL.Path
		// 如果url是以繁体前缀，则转换为query
		if strings.HasPrefix(path, tcLang) {
			req.URL.Path = path[len(tcLang):]
			rawQuery := req.URL.RawQuery
			if rawQuery == "" {
				req.URL.RawQuery = "lang=" + cs.LangTC
			} else {
				req.URL.RawQuery += ("&lang=" + cs.LangTC)
			}
		}
	})

	// 捕捉panic异常，避免程序崩溃
	d.Use(recover.New())

	d.Use(middleware.NewEntry())

	// 接口相关统计信息
	d.Use(stats.New(stats.Config{
		OnStats: func(info *stats.Info, c *elton.Context) {
			// ping 的日志忽略
			if info.URI == "/ping" {
				return
			}
			logger.Info("access log",
				zap.String("id", info.CID),
				zap.String("ip", info.IP),
				zap.String("sid", util.GetSessionID(c)),
				zap.String("method", info.Method),
				zap.String("uri", info.URI),
				zap.Int("status", info.Status),
				zap.String("consuming", info.Consuming.String()),
				zap.String("size", humanize.Bytes(uint64(info.Size))),
			)
		},
	}))

	d.Use(middleware.NewS2TConverter())

	// 错误处理，将错误转换为json响应
	d.Use(errorHandler.NewDefault())

	// IP限制
	d.Use(middleware.NewIPBlock())

	// 根据应用配置限制路由
	d.Use(middleware.NewRouterController())

	// 路由并发限制
	routerLimitConfig := config.GetRouterConcurrentLimit()
	if len(routerLimitConfig) != 0 {
		d.Use(routerLimiter.New(routerLimiter.Config{
			Limiter: routerLimiter.NewLocalLimiter(routerLimitConfig),
		}))
	}

	// 压缩响应数据（由pike来压缩数据）
	// d.Use(compress.NewDefault())

	// etag与fresh的处理
	d.Use(fresh.NewDefault())
	d.Use(etag.NewDefault())

	// 对响应数据 c.Body 转换为相应的json响应
	d.Use(responder.NewDefault())

	// 读取读取body的数的，转换为json bytes
	d.Use(bodyparser.NewDefault())

	// 初始化路由
	router.Init(d)

	err := dependServiceCheck()
	if err != nil {
		// 可以针对实际场景输出更多的日志信息
		logger.DPanic("exception",
			zap.Error(err),
		)
		panic(err)
	}
	logger.Info("start to linstening...",
		zap.String("listen", config.GetListen()),
	)
	d.ListenAndServe(config.GetListen())
}
