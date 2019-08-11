import React from "react";
import { Spin, message, Input, Menu, Icon } from "antd";
import { Link } from "react-router-dom";
import qs from "querystring";

import { BOOK_DETAIL_PATH, HOME_PATH, BOOK_CHAPTER_PATH } from "../../paths";
import { formatWordCount, parseQuery, getTimeline } from "../../helpers/util";
import "./home.sass";
import * as bookService from "../../services/book";
import ImageView from "../image_view";
import "intersection-observer";

const Search = Input.Search;

const homeKey = "home";
const hotKey = "hot";
const searchKey = "search";
const recentlyReadKey = "recentlyRead";

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

function getSort(location) {
  const query = parseQuery(location);
  if (!query) {
    return "";
  }
  return query.sort || "";
}

class Home extends React.Component {
  state = {
    category: "",
    keyword: "",
    sort: "",
    recentlyRead: null,
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
    this.state.sort = getSort(location);
  }
  async handleLoadContent(props) {
    const { category, keyword } = this.state;
    switch (category) {
      case recentlyReadKey:
        await this.getRecentlyRead();
        break;
      case searchKey:
        if (!keyword) {
          break;
        }
        await this.fetchList(props);
        break;
      default:
        await this.fetchList(props);
        break;
    }
  }
  async getRecentlyRead() {
    try {
      const data = await bookService.listRead();
      data.sort((a, b) => {
        if (a.updatedAt < b.updatedAt) {
          return 1;
        }
        return -1;
      });
      this.setState({
        recentlyRead: data
      });
    } catch (err) {
      message.error(err.message);
    } finally {
      this.setState({
        inited: true
      });
    }
  }
  async clearRead() {
    try {
      await bookService.clearRead();
      this.setState({
        recentlyRead: null
      });
      message.info("清除阅读记录成功!");
    } catch (err) {
      message.error(err.message);
    }
  }
  async fetchList(props) {
    const { loading, limit, offset, count, sort, keyword } = this.state;
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
      await this.handleLoadContent();
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
      sort: getSort(location),
      category,
      offset,
      keyword
    };
    this.setState(data, () => {
      this.handleLoadContent(newProps);
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
    if (!done && category !== searchKey && category !== recentlyReadKey) {
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
  renderRecentlyReadList() {
    const { category, recentlyRead } = this.state;
    if (category !== recentlyReadKey) {
      return;
    }
    let content = null;
    if (!recentlyRead || !recentlyRead.length) {
      content = (
        <p
          style={{
            textAlign: "center"
          }}
        >
          您尚未开始阅读！
        </p>
      );
    } else {
      const arr = recentlyRead.map(item => {
        const url = BOOK_CHAPTER_PATH.replace(":id", item.id).replace(
          ":no",
          item.no
        );
        return (
          <li key={item.id}>
            <Link to={url}>
              {item.title}
              <span className="time">
                (阅读于：{getTimeline(item.updatedAt)})
              </span>
              <span>{item.name}</span>
            </Link>
          </li>
        );
      });
      content = (
        <ul>
          {arr}
          <li
            key="clear"
            className="clear"
            onClick={() => {
              this.clearRead();
            }}
          >
            <Icon type="tags" />
            清除记录
          </li>
        </ul>
      );
    }
    return <div className="recentlyRead">{content}</div>;
  }
  render() {
    const { inited, category } = this.state;
    return (
      <div className="Home">
        <Menu
          className="menu"
          mode="horizontal"
          selectedKeys={[category]}
          onClick={e => {
            const { key } = e;
            const data = {
              category: key,
              sort: ""
            };
            if (key === hotKey) {
              data.sort = "-hot";
            }
            this.reset(() => {
              this.goTo(data, true);
            });
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
          <Menu.Item key={recentlyReadKey}>
            <Icon type="snippets" />
            最近阅读
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
        {this.renderRecentlyReadList()}
        {this.renderAutoLoadMore()}
      </div>
    );
  }
}

export default Home;
