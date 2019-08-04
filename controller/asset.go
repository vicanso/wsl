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
	"io"
	"os"
	"strconv"
	"strings"

	"github.com/gobuffalo/packr/v2"
	"github.com/vicanso/cod"
	"github.com/vicanso/wsl/router"
	"github.com/vicanso/wsl/service"

	staticServe "github.com/vicanso/cod-static-serve"
)

type (
	// assetCtrl asset ctrl
	assetCtrl struct {
	}
	staticFile struct {
		box *packr.Box
	}
)

var (
	box                 = packr.New("asset", "../web/build")
	contentPlacerholder = []byte("{CONTENT}")
)

const (
	indexFile          = "index.html"
	bookDetailURL      = "/book/%d"
	bookDetailTemplate = `<h3>书名：%s</h3>
		<p>作者：%s</p>
		<p>简介：%s</p>
		<ul>章节：%s</ul>
	`
	bookChapterURL      = "/book/%d/chapter/%d"
	bookChapterTemplate = `<h4>章节：%s</h4>
		<p>%s</p>
	`
)

func (sf *staticFile) Exists(file string) bool {
	return sf.box.Has(file)
}
func (sf *staticFile) Get(file string) ([]byte, error) {
	return sf.box.Find(file)
}
func (sf *staticFile) Stat(file string) os.FileInfo {
	return nil
}
func (sf *staticFile) NewReader(file string) (io.Reader, error) {
	buf, err := sf.Get(file)
	if err != nil {
		return nil, err
	}
	return bytes.NewReader(buf), nil
}

func init() {
	g := router.NewGroup("")
	ctrl := assetCtrl{}
	g.GET("/", ctrl.index)
	g.GET("/book/:bookID", ctrl.bookDetail)
	g.GET("/book/:bookID/chapter/:bookChapterNO", ctrl.bookChapterDetail)
	g.GET("/admin", ctrl.index)
	g.GET("/admin/*adminPath", ctrl.adminIndex)
	g.GET("/favicon.ico", ctrl.favIcon)

	sf := &staticFile{
		box: box,
	}
	g.GET("/static/*file", staticServe.New(sf, staticServe.Config{
		Path: "/static",
		// 客户端缓存一年
		MaxAge: 365 * 24 * 3600,
		// 缓存服务器缓存一个小时
		SMaxAge:             60 * 60,
		DenyQueryString:     true,
		DisableLastModified: true,
	}))
}

func getFileContetAndSetContentType(c *cod.Context, file string) (buf []byte, err error) {
	buf, err = box.Find(file)
	if err != nil {
		return
	}
	// 根据文件后续设置类型
	c.SetContentTypeByExt(file)
	return
}

func sendFile(c *cod.Context, file string) (err error) {
	buf, err := getFileContetAndSetContentType(c, file)
	if err != nil {
		return
	}
	c.BodyBuffer = bytes.NewBuffer(buf)
	return
}

func (ctrl assetCtrl) index(c *cod.Context) (err error) {
	c.CacheMaxAge("1m")
	buf, err := getFileContetAndSetContentType(c, indexFile)
	if err != nil {
		return
	}
	books, err := bookSrv.List(service.BookQueryParams{
		Limit:  1000,
		Fields: "id,name",
	})
	if err != nil {
		return
	}
	arr := make([]string, len(books))
	for index, item := range books {
		url := fmt.Sprintf(bookDetailURL, item.ID)
		html := fmt.Sprintf(`<li><a href="%s">%s</a></li>`, url, item.Name)
		arr[index] = html
	}
	content := "<ul>" + strings.Join(arr, "") + "</ul>"
	buf = bytes.Replace(buf, contentPlacerholder, []byte(content), 1)

	c.BodyBuffer = bytes.NewBuffer(buf)
	return
}

func (ctrl assetCtrl) bookDetail(c *cod.Context) (err error) {
	c.CacheMaxAge("1m")
	buf, err := getFileContetAndSetContentType(c, indexFile)
	if err != nil {
		return
	}
	id, _ := strconv.Atoi(c.Param("bookID"))
	book, err := bookSrv.GetByID(uint(id))
	if err != nil {
		return
	}
	chapters, err := bookSrv.ListChapter(service.ChapterQueryParams{
		BookID: uint(id),
		Fields: "title,no",
		Limit:  100,
	})
	if err != nil {
		return
	}
	arr := make([]string, len(chapters))
	for index, item := range chapters {
		url := fmt.Sprintf(bookChapterURL, id, item.NO)
		arr[index] = fmt.Sprintf(`<li><a href="%s">%s</a></li>`, url, item.Title)
	}

	html := fmt.Sprintf(bookDetailTemplate, book.Name, book.Author, book.Summary, strings.Join(arr, ""))
	buf = bytes.Replace(buf, contentPlacerholder, []byte(html), 1)

	c.BodyBuffer = bytes.NewBuffer(buf)
	return
}

func (ctrl assetCtrl) bookChapterDetail(c *cod.Context) (err error) {
	c.CacheMaxAge("1m")
	buf, err := getFileContetAndSetContentType(c, indexFile)
	if err != nil {
		return
	}
	id, _ := strconv.Atoi(c.Param("bookID"))
	chapterNO, _ := strconv.Atoi(c.Param("bookChapterNO"))
	chapters, err := bookSrv.ListChapter(service.ChapterQueryParams{
		BookID: uint(id),
		Offset: chapterNO,
		Limit:  1,
	})
	if err != nil {
		return
	}
	if len(chapters) != 0 {
		chapter := chapters[0]
		html := fmt.Sprintf(bookChapterTemplate, chapter.Title, chapter.Content)
		buf = bytes.Replace(buf, contentPlacerholder, []byte(html), 1)
	}

	c.BodyBuffer = bytes.NewBuffer(buf)
	return
}

func (ctrl assetCtrl) adminIndex(c *cod.Context) (err error) {
	c.CacheMaxAge("10s")
	return sendFile(c, indexFile)
}

func (ctrl assetCtrl) favIcon(c *cod.Context) (err error) {
	c.SetHeader(cod.HeaderAcceptEncoding, "public, max-age=3600, s-maxage=600")
	return sendFile(c, "favicon.ico")
}
