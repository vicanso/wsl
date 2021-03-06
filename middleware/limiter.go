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

package middleware

import (
	"net/http"
	"time"

	"github.com/vicanso/elton"
	"github.com/vicanso/hes"
	"github.com/vicanso/wsl/log"
	"github.com/vicanso/wsl/service"
	"go.uber.org/zap"

	concurrentLimiter "github.com/vicanso/elton-concurrent-limiter"
)

const (
	concurrentLimitKeyPrefix = "mid-concurrent-limit"
	ipLimitKeyPrefix         = "mid-ip-limit"
	errLimitCategory         = "request-limit"
)

var (
	errTooFrequently = &hes.Error{
		StatusCode: http.StatusBadRequest,
		Message:    "request to frequently",
		Category:   errLimitCategory,
	}
	redisSrv = new(service.RedisSrv)
)

// createConcurrentLimitLock 创建并发限制的lock函数
func createConcurrentLimitLock(prefix string, ttl time.Duration, withDone bool) concurrentLimiter.Lock {
	return func(key string, _ *elton.Context) (success bool, done func(), err error) {
		k := concurrentLimitKeyPrefix + "-" + prefix + "-" + key
		done = nil
		if withDone {
			success, redisDone, err := redisSrv.LockWithDone(k, ttl)
			done = func() {
				err := redisDone()
				if err != nil {
					log.Default().Error("redis done fail",
						zap.String("key", k),
						zap.Error(err),
					)
				}
			}
			return success, done, err
		}
		success, err = redisSrv.Lock(k, ttl)
		return
	}
}

// NewConcurrentLimit create a concurrent limit
func NewConcurrentLimit(keys []string, ttl time.Duration, prefix string) elton.Handler {
	return concurrentLimiter.New(concurrentLimiter.Config{
		Lock: createConcurrentLimitLock(prefix, ttl, false),
		Keys: keys,
	})
}

// NewIPLimit create a limit middleware by ip address
func NewIPLimit(maxCount int64, ttl time.Duration, prefix string) elton.Handler {
	return func(c *elton.Context) (err error) {
		key := ipLimitKeyPrefix + "-" + prefix + "-" + c.RealIP()
		count, err := redisSrv.IncWithTTL(key, ttl)
		if err != nil {
			return
		}
		if count > maxCount {
			err = errTooFrequently
			return
		}
		return c.Next()
	}
}
