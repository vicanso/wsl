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
	"strconv"

	"github.com/vicanso/cod"
	"github.com/vicanso/wsl/config"
	"github.com/vicanso/wsl/cs"
	"github.com/vicanso/wsl/router"
	"github.com/vicanso/wsl/service"
	"github.com/vicanso/wsl/validate"
	"go.uber.org/zap"
)

type (
	bookCtrl struct{}

	listBookParmas struct {
		Sort    string `json:"sort,omitempty" valid:"xSort,optional"`
		Limit   string `json:"limit,omitempty" valid:"xLimit"`
		Offset  string `json:"offset,omitempty" valid:"xOffset"`
		Keyword string `json:"keyword,omitempty" valid:"xBookKeyword,optional"`
	}
	listChapterParams struct {
		Fields string `json:"fields,omitempty" valid:"xFields"`
		Limit  string `json:"limit,omitempty" valid:"xLimit"`
		Offset string `json:"offset,omitempty" valid:"xOffset"`
	}
	updateBookParams struct {
		Hot     int    `json:"hot,omitempty" valid:"xBookHot,optional"`
		Summary string `json:"summary,omitempty" valid:"xBookSummary,optional"`
	}
)

func init() {
	ctrl := bookCtrl{}
	g := router.NewGroup("/books")

	g.POST("/sync-wsl", ctrl.syncWsl)

	g.GET("/v1", ctrl.list)
	g.GET("/v1/:bookID", ctrl.detail)
	g.PATCH(
		"/v1/:bookID",
		newTracker(cs.ActionBookUpdate),
		shouldBeAdmin,
		ctrl.update,
	)
	g.GET("/v1/:bookID/chapters", ctrl.listChapter)

}

func (ctrl bookCtrl) syncWsl(c *cod.Context) (err error) {
	filePath := config.GetString("filePath")
	go func() {
		err := bookSrv.SyncFromFile(filePath)
		if err != nil {
			logger.Error("sync wsl fail",
				zap.Error(err),
			)
			return
		}
		logger.Info("sync wsl done")
	}()
	c.NoContent()
	return
}

// list list book
func (ctrl bookCtrl) list(c *cod.Context) (err error) {
	params := &listBookParmas{}
	err = validate.Do(params, c.Query())
	if err != nil {
		return
	}
	limit, _ := strconv.Atoi(params.Limit)
	offset, _ := strconv.Atoi(params.Offset)
	query := service.BookQueryParams{
		Limit:   limit,
		Offset:  offset,
		Keyword: params.Keyword,
		Sort:    params.Sort,
	}
	books, err := bookSrv.List(query)
	if err != nil {
		return
	}
	count := -1
	if offset == 0 {
		count, err = bookSrv.Count(query)
		if err != nil {
			return
		}
	}
	c.CacheMaxAge("1m")
	c.Body = &struct {
		Books []*service.Book `json:"books,omitempty"`
		Count int             `json:"count,omitempty"`
	}{
		books,
		count,
	}
	return
}

// detail get detail content
func (ctrl bookCtrl) detail(c *cod.Context) (err error) {
	bookID, _ := strconv.Atoi(c.Param("bookID"))
	book, err := bookSrv.GetByID(uint(bookID))
	if err != nil {
		return
	}

	c.CacheMaxAge("1m")
	c.Body = book
	return
}

// listChapter list chapter
func (ctrl bookCtrl) listChapter(c *cod.Context) (err error) {
	params := &listChapterParams{}
	err = validate.Do(params, c.Query())
	if err != nil {
		return
	}
	bookID, _ := strconv.Atoi(c.Param("bookID"))
	limit, _ := strconv.Atoi(params.Limit)
	offset, _ := strconv.Atoi(params.Offset)
	query := service.ChapterQueryParams{
		Fields: params.Fields,
		BookID: uint(bookID),
		Offset: offset,
		Limit:  limit,
	}
	chapters, err := bookSrv.ListChapter(query)
	if err != nil {
		return
	}

	c.CacheMaxAge("1m")
	c.Body = &struct {
		Chapters []*service.Chapter `json:"chapters,omitempty"`
	}{
		chapters,
	}
	return
}

func (ctrl bookCtrl) update(c *cod.Context) (err error) {
	params := &updateBookParams{}
	err = validate.Do(params, c.RequestBody)
	if err != nil {
		return
	}
	bookID, _ := strconv.Atoi(c.Param("bookID"))
	err = bookSrv.UpdateByID(uint(bookID), service.Book{
		Hot:     params.Hot,
		Summary: params.Summary,
	})
	if err != nil {
		return
	}

	c.NoContent()
	return
}
