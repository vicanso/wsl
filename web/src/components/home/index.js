import React from "react";
import { Spin, message, Input, Menu, Icon } from "antd";
import { Link } from "react-router-dom";
import qs from "querystring";

import { BOOK_DETAIL_PATH, HOME_PATH } from "../../paths";
import { formatWordCount, parseQuery } from "../../helpers/util";
import "./home.sass";
import * as bookService from "../../services/book";
import ImageView from "../image_view";
import "intersection-observer";

const Search = Input.Search;

const homeKey = "home";
const hotKey = "hot";
const searchKey = "search";

function getOffset(location) {
  const query = parseQuery(location);
  const v = Number.parseInt(query && query.offset);
  let offset = 0;
  if (!Number.isNaN(v)) {
    offset = v;
  }
  return offset;
}

function getCategory(location) {
  const query = parseQuery(location);
  if (!query) {
    return homeKey;
  }
  return query.category || homeKey;
}

function getKeyword(location) {
  const query = parseQuery(location);
  if (!query) {
    return "";
  }
  return query.keyword || "";
}

class Home extends React.Component {
  state = {
    category: "",
    keyword: "",
    sort: "",
    books: [],
    done: false,
    loading: false,
    inited: false,
    count: 0,
    offset: 0,
    limit: 10
  };
  loadMoreRef = React.createRef();
  constructor(props) {
    super(props);
    const { location } = props;
    this.state.category = getCategory(location);
    this.state.offset = getOffset(location);
  }
  async fetchList(props) {
    const {
      loading,
      limit,
      offset,
      count,
      sort,
      keyword,
      category
    } = this.state;
    if (loading) {
      return;
    }
    // 如果是搜索但是无关键字
    if (category === searchKey && !keyword) {
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
        offset
      });
      const arr = this.state.books.slice(0);
      const updateData = {
        books: arr.concat(data.books)
      };
      let currentCount = count;
      if (offset === 0) {
        updateData.count = data.count;
        currentCount = data.count;
      }
      if (offset + data.books.length >= currentCount) {
        updateData.done = true;
      }
      this.setState(updateData);
    } catch (err) {
      message.error(err.message);
    } finally {
      this.setState({
        inited: true,
        loading: false
      });
    }
  }
  async componentDidMount() {
    try {
      await this.fetchList();
    } finally {
      const io = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) {
          return;
        }
        this.loadMore();
      });
      io.POLL_INTERVAL = 300; // Time in milliseconds.
      io.observe(this.loadMoreRef.current);
      this.loadMoreIO = io;
    }
  }
  componentWillUnmount() {
    this.loadMoreIO.disconnect();
  }
  componentWillReceiveProps(newProps) {
    if (newProps.location.search === this.props.location.search) {
      return;
    }
    const { location } = newProps;
    const category = getCategory(location);
    const offset = getOffset(location);
    const keyword = getKeyword(location);
    const data = {
      category,
      offset,
      keyword
    };
    this.setState(data, () => {
      this.fetchList(newProps);
    });
  }
  goTo(query, replaced = false) {
    const { history, location } = this.props;
    let params = query;
    if (!replaced) {
      const currentQuery = parseQuery(location);
      params = Object.assign({}, currentQuery, query);
    }
    const str = qs.stringify(params);
    history.push(`${HOME_PATH}?${str}`);
  }
  loadMore() {
    const { limit, offset, category } = this.state;
    // 搜索页面无需要自动加载
    if (category === searchKey) {
      return;
    }
    this.goTo({
      offset: limit + offset
    });
  }
  renderList() {
    const { books, offset } = this.state;
    if (books.length === 0) {
      return;
    }
    const arr = books.map(item => {
      const url = `${BOOK_DETAIL_PATH.replace(
        ":id",
        item.id
      )}?offset=${offset}`;
      let cover = null;
      if (item.cover) {
        cover = <ImageView url={item.cover} />;
      }
      return (
        <li className="book" key={`${item.id}`}>
          <Link to={url}>
            <div className="cover">{cover}</div>
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
      </div>
    );
  }
  reset(cb) {
    this.setState(
      {
        done: false,
        books: []
      },
      cb
    );
  }
  renderAutoLoadMore() {
    const { done, category } = this.state;
    let content = null;
    if (!done && category !== searchKey) {
      content = (
        <div>
          <Icon type="appstore" />
          正在加载更多...
        </div>
      );
    }
    return (
      <div className="loadMore" ref={this.loadMoreRef}>
        {content}
      </div>
    );
  }
  render() {
    const { inited, done, category } = this.state;
    return (
      <div className="Home">
        <Menu
          className="menu"
          mode="horizontal"
          selectedKeys={[category]}
          onClick={e => {
            const { key } = e;
            this.reset(() => {
              this.goTo(
                {
                  category: key
                },
                true
              );
            });

            // const data = {
            //   current: key
            // };
            // if (key === hotKey) {
            //   data.sort = "-hot";
            // }
            // this.reset();
            // this.setState(data, () => {
            //   history.push(`${HOME_PATH}?offset=${offset + limit}`);
            //   if (key !== searchKey) {
            //     this.fetchList();
            //   }
            // });
          }}
        >
          <Menu.Item key={homeKey}>
            <Icon type="book" />
            全集
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
        {category === searchKey && (
          <div className="keyword">
            <Search
              size="large"
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
          </div>
        )}

        {!inited && (
          <div className="loadingWrapper">
            <Spin tip={"加载中"} />
          </div>
        )}
        {this.renderList()}
        {this.renderAutoLoadMore()}
      </div>
    );
  }
}

export default Home;
