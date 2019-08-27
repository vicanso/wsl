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
	"github.com/vicanso/elton"
	"github.com/vicanso/wsl/cs"
	"github.com/vicanso/wsl/router"
	"github.com/vicanso/wsl/service"

	staticServe "github.com/vicanso/elton-static-serve"
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
	box                = packr.New("asset", "../web/build")
	contentPlaceholder = []byte("{CONTENT}")
	titlePlaceHolder   = []byte("{TITLE}")
)

const (
	indexFile          = "index.html"
	bookDetailURL      = "/book/%d"
	bookDetailTemplate = `<h3>%s</h3>
		<p>%s</p>
		<p>%s</p>
		<ul>%s</ul>
	`
	bookChapterURL      = "/book/%d/chapter/%d"
	bookChapterTemplate = `<h4>%s</h4>
		<div>%s</div>
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

func getFileContetAndSetContentType(c *elton.Context, file string) (buf []byte, err error) {
	buf, err = box.Find(file)
	if err != nil {
		return
	}
	// 根据文件后续设置类型
	c.SetContentTypeByExt(file)
	return
}

func sendFile(c *elton.Context, file string) (err error) {
	buf, err := getFileContetAndSetContentType(c, file)
	if err != nil {
		return
	}
	c.BodyBuffer = bytes.NewBuffer(buf)
	return
}

func (ctrl assetCtrl) index(c *elton.Context) (err error) {
	buf, err := getFileContetAndSetContentType(c, indexFile)
	if err != nil {
		return
	}
	books, err := bookSrv.List(service.BookQueryParams{
		Limit:  1000,
		Fields: "id,name,summary",
	})
	if err != nil {
		return
	}
	arr := make([]string, len(books))
	detailURL := bookDetailURL
	trimSummary := false
	if c.QueryParam("lang") == cs.LangTC {
		detailURL = "/" + cs.LangTC + detailURL
		trimSummary = true
	}
	for index, item := range books {
		url := fmt.Sprintf(detailURL, item.ID)
		if trimSummary {
			item.Summary = ""
		}
		html := fmt.Sprintf(`<li><h3><a href="%s">%s</a></h3><p>%s</p></li>`, url, item.Name, item.Summary)
		arr[index] = html
	}
	content := "<ul>" + strings.Join(arr, "") + "</ul>"
	buf = bytes.Replace(buf, contentPlaceholder, []byte(content), 1)
	buf = bytes.Replace(buf, titlePlaceHolder, []byte("卫斯理小说"), 1)

	c.CacheMaxAge("10m")
	c.BodyBuffer = bytes.NewBuffer(buf)
	return
}

func (ctrl assetCtrl) bookDetail(c *elton.Context) (err error) {
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
	chapterURL := bookChapterURL
	if c.QueryParam("lang") == cs.LangTC {
		chapterURL = "/" + cs.LangTC + chapterURL
	}
	for index, item := range chapters {
		url := fmt.Sprintf(chapterURL, id, item.NO)
		arr[index] = fmt.Sprintf(`<li><a href="%s">%s</a></li>`, url, item.Title)
	}

	html := fmt.Sprintf(bookDetailTemplate, book.Name, book.Author, book.Summary, strings.Join(arr, ""))
	buf = bytes.Replace(buf, contentPlaceholder, []byte(html), 1)
	buf = bytes.Replace(buf, titlePlaceHolder, []byte(book.Name+"-卫斯理小说"), 1)

	c.CacheMaxAge("1m")
	c.BodyBuffer = bytes.NewBuffer(buf)
	return
}

func (ctrl assetCtrl) bookChapterDetail(c *elton.Context) (err error) {
	buf, err := getFileContetAndSetContentType(c, indexFile)
	if err != nil {
		return
	}
	id, _ := strconv.Atoi(c.Param("bookID"))
	book, err := bookSrv.GetByID(uint(id))
	if err != nil {
		return
	}
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
		contentList := make([]string, 0)
		for _, content := range strings.Split(chapter.Content, "\n") {
			contentList = append(contentList, "<p>"+content+"</p>")
		}
		html := fmt.Sprintf(bookChapterTemplate, chapter.Title, strings.Join(contentList, ""))
		buf = bytes.Replace(buf, contentPlaceholder, []byte(html), 1)
		buf = bytes.Replace(buf, titlePlaceHolder, []byte(chapter.Title+"-"+book.Name+"-卫斯理小说"), 1)
	}

	c.CacheMaxAge("1m")
	c.BodyBuffer = bytes.NewBuffer(buf)
	return
}

func (ctrl assetCtrl) adminIndex(c *elton.Context) (err error) {
	c.CacheMaxAge("10s")
	return sendFile(c, indexFile)
}

func (ctrl assetCtrl) favIcon(c *elton.Context) (err error) {
	c.SetHeader(elton.HeaderAcceptEncoding, "public, max-age=3600, s-maxage=600")
	return sendFile(c, "favicon.ico")
}
