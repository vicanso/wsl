import axios from "axios";

import { BOOKS_DETAIL, BOOKS_CHAPTERS, BOOKS } from "../urls";

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
  if (!data.books) {
    data.books = [];
  }
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
  return data;
}
