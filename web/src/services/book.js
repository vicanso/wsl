import axios from "axios";
import localforage from "localforage";

import { BOOKS_DETAIL, BOOKS_CHAPTERS, BOOKS } from "../urls";

const readBookKey = "my-read-book-list";

// detail 获取书籍详情
export async function detail(id) {
  const url = BOOKS_DETAIL.replace(":id", id);
  const { data } = await axios.get(url);
  return data;
}

// listChapters 获取书籍章节列表
export async function listChapters(id, params) {
  const url = BOOKS_CHAPTERS.replace(":id", id);
  const { data } = await axios.get(url, {
    params
  });
  if (!data.chapters) {
    data.chapters = [];
  }
  data.chapters.forEach(item => {
    if (!item.no) {
      item.no = 0;
    }
  });
  return data;
}

// updateByID 更新书籍
export async function updateByID(id, params) {
  const url = BOOKS_DETAIL.replace(":id", id);
  const { data } = await axios.patch(url, params);
  return data;
}

// list 获取书籍列表
export async function list(params) {
  const { data } = await axios.get(BOOKS, {
    params
  });
  if (!data.books) {
    data.books = [];
  }
  return data;
}

let chapterContentCache = null;
function getChapterContentFromCache(bookID, chapterIndex) {
  if (!chapterContentCache) {
    return null;
  }
  if (chapterContentCache.bookID !== bookID) {
    return null;
  }
  let found = null;
  chapterContentCache.chapters.forEach(item => {
    if (item.no === chapterIndex) {
      found = item;
    }
  });
  return found;
}

// getChapterContent 获取章节内容
export async function getChapterContent(bookID, chapterIndex) {
  // 先从缓存读取
  const found = getChapterContentFromCache(bookID, chapterIndex);
  if (found) {
    return found;
  }
  const limit = 5;
  const offset = Math.floor(chapterIndex / limit) * limit;
  // 失败则从服务器读取
  const data = await listChapters(bookID, {
    offset,
    limit,
    fields: "no,title,content"
  });
  const chapters = (data && data.chapters) || [];

  // 写入缓存
  chapterContentCache = {
    bookID,
    chapters
  };
  return getChapterContentFromCache(bookID, chapterIndex);
}

// listRead 获取阅读书籍
export async function listRead() {
  const data = await localforage.getItem(readBookKey);
  let bookList = [];
  if (data) {
    bookList = JSON.parse(data);
  }
  return bookList;
}

// setRead 设置书籍阅读信息
export async function setRead(bookID, chapterIndex) {
  const bookList = await listRead();
  let found = -1;
  bookList.forEach((item, index) => {
    if (item.bookID === bookID) {
      found = index;
    }
  });
  if (found !== -1) {
    bookList.splice(found, 1);
  }
  bookList.push({
    bookID,
    chapterIndex,
    updatedAt: new Date().toISOString()
  });
  // 最多只保存20个记录
  if (bookList.length > 20) {
    bookList.shift();
  }
  await localforage.setItem(readBookKey, JSON.stringify(bookList));
}

// getRead 获取书籍阅读信息
export async function getRead(bookID) {
  const bookList = await listRead();
  let found = null;
  bookList.forEach(item => {
    if (item.bookID === bookID) {
      found = item;
    }
  });
  return found;
}
