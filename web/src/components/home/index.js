import React from "react";
import { Spin, message, Button, Input, Menu, Icon } from "antd";
import { Link } from "react-router-dom";

import { BOOK_DETAIL_PATH } from "../../paths";
import { formatWordCount } from "../../helpers/util";
import "./home.sass";
import * as bookService from "../../services/book";

const Search = Input.Search;

const homeKey = "home";
const hotKey = "hot";
const searchKey = "search";

class Home extends React.Component {
  state = {
    current: "home",
    keyword: "",
    sort: "",
    books: [],
    done: false,
    loading: false,
    count: 0,
    limit: 10,
    offset: 0
  };
  async fetchList(newOffset = 0) {
    const { loading, limit, count, keyword, sort } = this.state;
    if (loading) {
      return;
    }
    this.setState({
      loading: true
    });
    try {
      const data = await bookService.list({
        sort,
        keyword,
        limit,
        offset: newOffset
      });
      const arr = this.state.books.slice(0);
      const updateData = {
        offset: newOffset,
        books: arr.concat(data.books)
      };
      let current = count;
      if (newOffset === 0) {
        updateData.count = data.count;
        current = data.count;
      }
      if (newOffset + data.books.length >= current) {
        updateData.done = true;
      }
      this.setState(updateData);
    } catch (err) {
      message.error(err.message);
    } finally {
      this.setState({
        loading: false
      });
    }
  }
  componentDidMount() {
    this.fetchList();
  }
  loadMore() {
    const { offset, limit } = this.state;
    this.fetchList(offset + limit);
  }
  renderList() {
    const { books, done } = this.state;
    if (books.length === 0) {
      return;
    }
    const arr = books.map(item => {
      const url = BOOK_DETAIL_PATH.replace(":id", item.id);
      return (
        <li className="book" key={`${item.id}`}>
          <Link to={url}>
            <div className="cover"></div>
            <div className="content">
              <h3>{item.name}</h3>
              <p>{item.summary || "暂无简介"}</p>
              <div className="otherInfos">
                <div className="tags">
                  <span className="tag">{formatWordCount(item.wordCount)}</span>
                </div>
                <span className="author">{item.author}</span>
              </div>
            </div>
          </Link>
        </li>
      );
    });
    return (
      <div>
        <ul className="books">{arr}</ul>
        {!done && (
          <Button
            className="loadMore"
            size="large"
            onClick={() => this.loadMore()}
          >
            加载更多
          </Button>
        )}
      </div>
    );
  }
  reset() {
    this.setState({
      keyword: "",
      sort: "",
      done: false,
      books: []
    });
  }
  render() {
    const { loading, current } = this.state;
    return (
      <div className="Home">
        <Menu
          className="menu"
          mode="horizontal"
          selectedKeys={[current]}
          onClick={e => {
            const { key } = e;
            const data = {
              current: key
            };
            if (key === hotKey) {
              data.sort = "-hot";
            }
            this.reset();
            this.setState(data, () => {
              if (key !== searchKey) {
                this.fetchList();
              }
            });
          }}
        >
          <Menu.Item key={homeKey}>
            <Icon type="book" />
            卫斯理全集
          </Menu.Item>
          <Menu.Item key={hotKey}>
            <Icon type="fire" />
            热门
          </Menu.Item>
          <Menu.Item key={searchKey}>
            <Icon type="search" />
            搜索
          </Menu.Item>
        </Menu>
        {current === searchKey && (
          <Search
            size="large"
            className="keyword"
            placeholder="请输入关键字"
            onSearch={keyword => {
              this.reset();
              this.setState(
                {
                  keyword
                },
                () => {
                  this.fetchList();
                }
              );
            }}
            enterButton
          />
        )}

        {loading && (
          <div className="loadingWrapper">
            <Spin tip={"加载中"} />
          </div>
        )}
        {this.renderList()}
      </div>
    );
  }
}

export default Home;
