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

package service

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"path/filepath"
	"time"

	"github.com/jinzhu/gorm"
)

const (
	defaultBookLimit    = 10
	defaultChapterLimit = 10
)

type (
	// Book book
	Book struct {
		ID        uint       `gorm:"primary_key" json:"id,omitempty"`
		CreatedAt time.Time  `json:"createdAt,omitempty"`
		UpdatedAt time.Time  `json:"updatedAt,omitempty"`
		DeletedAt *time.Time `sql:"index" json:"deletedAt,omitempty"`

		Name    string `json:"name,omitempty" gorm:"type:varchar(100);not null;unique_index:name_author;"`
		Author  string `json:"author,omitempty" gorm:"type:varchar(40);not null;unique_index:name_author;"`
		Summary string `json:"summary,omitempty" gorm:"type:varchar(500);not null;"`
		Hot     int    `json:"hot,omitempty"`
	}
	// Chapter chapter
	Chapter struct {
		ID        uint       `gorm:"primary_key" json:"id,omitempty"`
		CreatedAt time.Time  `json:"createdAt,omitempty"`
		UpdatedAt time.Time  `json:"updatedAt,omitempty"`
		DeletedAt *time.Time `sql:"index" json:"deletedAt,omitempty"`

		BookID  uint   `json:"bookID,omitempty" gorm:"not null;unique_index:book_id_no;"`
		NO      uint   `json:"no,omitempty" gorm:"not null;unique_index:book_id_no;"`
		Title   string `json:"title,omitempty"`
		Content string `json:"content,omitempty"`
	}
	// BookQueryParams book query params
	BookQueryParams struct {
		Offset  int
		Limit   int
		Keyword string
	}
	// ChapterQueryParams chapter query params
	ChapterQueryParams struct {
		BookID uint
		Offset int
		Limit  int
	}
	// BookSrv book service
	BookSrv struct {
	}
)

func init() {
	pgGetClient().AutoMigrate(&Book{}).
		AutoMigrate(&Chapter{})
}

func getChapters(path string, book Book) (err error) {
	chaptersFile := filepath.Join(path, book.Name, "chapters.json")
	buf, err := ioutil.ReadFile(chaptersFile)
	if err != nil {
		return
	}
	chapters := make([]*struct {
		Title string
	}, 0)
	err = json.Unmarshal(buf, &chapters)
	if err != nil {
		return
	}
	for index, item := range chapters {
		file := filepath.Join(path, book.Name, fmt.Sprintf("chapter-%d.txt", index))
		buf, err = ioutil.ReadFile(file)
		if err != nil {
			return
		}
		chapter := Chapter{}

		err = pgGetClient().Where(Chapter{
			BookID:  book.ID,
			NO:      uint(index),
			Title:   item.Title,
			Content: string(buf),
		}).FirstOrCreate(&chapter).Error
		if err != nil {
			return
		}
	}
	return
}

// SyncFromFile sync from file
func (srv *BookSrv) SyncFromFile(path string) (err error) {
	listFile := filepath.Join(path, "books.json")
	buf, err := ioutil.ReadFile(listFile)
	if err != nil {
		return
	}
	books := make([]*struct {
		Name   string
		Author string
	}, 0)
	err = json.Unmarshal(buf, &books)
	if err != nil {
		return
	}

	for _, item := range books {
		book := Book{}
		err = pgGetClient().Where(Book{
			Name:   item.Name,
			Author: item.Author,
		}).FirstOrCreate(&book).Error
		if err != nil {
			return
		}
		err = getChapters(path, book)
		if err != nil {
			return
		}
	}
	return
}

func newBookQuery(params BookQueryParams) *gorm.DB {
	db := pgGetClient()
	if params.Keyword != "" {
		db = db.Where("name LIKE ?", "%"+params.Keyword+"%")
	}
	return db
}

// Count count book
func (srv *BookSrv) Count(params BookQueryParams) (count int, err error) {
	db := newBookQuery(params)
	err = db.Model(&Book{}).Count(&count).Error
	return
}

// List list book
func (srv *BookSrv) List(params BookQueryParams) (result []*Book, err error) {
	result = make([]*Book, 0)
	db := newBookQuery(params)

	if params.Limit <= 10 {
		db = db.Limit(defaultBookLimit)
	} else {
		db = db.Limit(params.Limit)
	}
	if params.Offset > 0 {
		db = db.Offset(params.Offset)
	}

	err = db.Find(&result).Error
	return
}

func newChapterQuery(params ChapterQueryParams) *gorm.DB {
	db := pgGetClient()
	if params.BookID != 0 {
		db = db.Where("book_id = ?", params.BookID)
	}
	return db
}

// ListChapter list chapter
func (srv *BookSrv) ListChapter(params ChapterQueryParams) (result []*Chapter, err error) {
	result = make([]*Chapter, 0)
	db := newChapterQuery(params)
	if params.Limit <= 0 {
		db = db.Limit(defaultChapterLimit)
	} else {
		db = db.Limit(params.Limit)
	}

	if params.Offset > 0 {
		db = db.Offset(params.Offset)
	}
	err = db.Find(&result).Error
	return
}

// GetByID get book by id
func (srv *BookSrv) GetByID(id uint) (book *Book, err error) {
	book = &Book{
		ID: id,
	}
	err = pgGetClient().First(book).Error
	return
}
