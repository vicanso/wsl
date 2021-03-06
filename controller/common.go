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

package controller

import (
	"bytes"
	"fmt"
	"strconv"
	"strings"

	"github.com/vicanso/wsl/cs"
	"github.com/vicanso/wsl/service"
	"github.com/vicanso/wsl/util"

	"github.com/vicanso/elton"
	"github.com/vicanso/wsl/router"
)

type (
	commonCtrl struct{}
)

func init() {
	ctrl := commonCtrl{}
	g := router.NewGroup("")

	g.GET("/ping", ctrl.ping)

	g.GET("/ip-location", ctrl.location)

	g.GET("/routers", ctrl.routers)

	g.GET("/random-keys", ctrl.randomKeys)

	g.GET("/captcha", ctrl.captcha)

	g.GET("/sitemap.xml", ctrl.sitemap)
	g.GET("/robots.txt", ctrl.robots)
}

func (ctrl commonCtrl) ping(c *elton.Context) error {
	c.BodyBuffer = bytes.NewBufferString("pong")
	return nil
}

func (ctrl commonCtrl) location(c *elton.Context) (err error) {
	info, err := service.GetLocationByIP(c.RealIP(), c)
	if err != nil {
		return
	}
	c.Body = info
	return
}

func (ctrl commonCtrl) routers(c *elton.Context) (err error) {
	c.Body = map[string]interface{}{
		"routers": c.Elton().Routers,
	}
	return
}

func (ctrl commonCtrl) randomKeys(c *elton.Context) (err error) {
	n, _ := strconv.Atoi(c.QueryParam("n"))
	size, _ := strconv.Atoi(c.QueryParam("size"))
	if size < 1 {
		size = 1
	}
	if n < 1 {
		n = 1
	}
	result := make([]string, size)
	for index := 0; index < size; index++ {
		result[index] = util.RandomString(n)
	}
	c.Body = map[string][]string{
		"keys": result,
	}
	return
}

func (ctrl commonCtrl) captcha(c *elton.Context) (err error) {
	info, err := service.GetCaptcha()
	if err != nil {
		return
	}
	// c.SetContentTypeByExt(".png")
	// c.Body = info.Data
	c.Body = info
	return
}

func (ctrl commonCtrl) sitemap(c *elton.Context) (err error) {
	template := `<?xml version="1.0" encoding="UTF-8"?>
	<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"> 
	  %s
	</urlset>`
	urlTemplate := `<url>
		<loc>%s</loc>
		<priority>%v</priority>
		<changefreq>daily</changefreq>
	</url>`
	books, err := bookSrv.List(service.BookQueryParams{
		Limit: 200,
	})
	if err != nil {
		return
	}
	homeURL := "https://wsl520.com/"
	tcHomeURL := homeURL + cs.LangTC + "/"
	urls := make([]string, 0, 1000)
	bookURL := homeURL + "book/%d"
	tcBookURL := tcHomeURL + "book/%d"
	bookPriority := 0.9
	bookDetailURL := homeURL + "book/%d/chapter/%d"
	tcBookDetailURL := tcHomeURL + "book/%d/chapter/%d"
	bookDetailPriority := 0.63
	urls = append(urls, fmt.Sprintf(urlTemplate, homeURL, 1.0))
	urls = append(urls, fmt.Sprintf(urlTemplate, tcHomeURL, 1.0))

	for _, book := range books {

		url := fmt.Sprintf(bookURL, book.ID)
		urls = append(urls, fmt.Sprintf(urlTemplate, url, bookPriority))
		url = fmt.Sprintf(tcBookURL, book.ID)
		urls = append(urls, fmt.Sprintf(urlTemplate, url, bookPriority))
		for index := 0; index < book.ChapterCount; index++ {
			url := fmt.Sprintf(bookDetailURL, book.ID, index)
			urls = append(urls, fmt.Sprintf(urlTemplate, url, bookDetailPriority))

			url = fmt.Sprintf(tcBookDetailURL, book.ID, index)
			urls = append(urls, fmt.Sprintf(urlTemplate, url, bookDetailPriority))
		}
	}
	c.CacheMaxAge("5m")
	c.SetContentTypeByExt(".xml")
	c.BodyBuffer = bytes.NewBufferString(fmt.Sprintf(template, strings.Join(urls, "")))
	return
}

func (ctrl commonCtrl) robots(c *elton.Context) (err error) {
	c.CacheMaxAge("5m")
	c.BodyBuffer = bytes.NewBufferString(`
Sitemap: https://wsl520.com/sitemap.xml
	`)
	return
}
