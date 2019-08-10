import React from "react";
import { Spin, message, Input, Menu, Icon } from "antd";
import { Link } from "react-router-dom";

import { BOOK_DETAIL_PATH, HOME_PATH } from "../../paths";
import { formatWordCount } from "../../helpers/util";
import "./home.sass";
import * as bookService from "../../services/book";
import ImageView from "../image_view";
import "intersection-observer";

const Search = Input.Search;

const homeKey = "home";
const hotKey = "hot";
const searchKey = "search";

function getOffset(location) {
  if (!location || !location.search) {
    return 0;
  }
  const reg = /offset=(\d+)/;
  const result = reg.exec(location.search);
  if (!result || !result[1]) {
    return 0;
  }
  const value = Number.parseInt(result[1]);
  if (Number.isNaN(value)) {
    return 0;
  }
  return value;
}

class Home extends React.Component {
  state = {
    current: "home",
    keyword: "",
    sort: "",
    books: [],
    done: false,
    loading: false,
    inited: false,
    count: 0,
    limit: 10,
    offset: 0
  };
  loadMoreRef = React.createRef();
  constructor(props) {
    super(props);
    this.state.offset = getOffset(props.location);
  }
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
        inited: true,
        loading: false
      });
    }
  }
  async componentDidMount() {
    try {
      await this.fetchList(this.state.offset);
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
    const offset = getOffset(newProps.location);
    this.fetchList(offset);
  }
  loadMore() {
    const { history } = this.props;
    const { offset, limit } = this.state;
    history.push(`${HOME_PATH}?offset=${offset + limit}`);
  }
  renderList() {
    const { books } = this.state;
    if (books.length === 0) {
      return;
    }
    const arr = books.map(item => {
      const url = BOOK_DETAIL_PATH.replace(":id", item.id);
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
  reset() {
    this.setState({
      keyword: "",
      sort: "",
      done: false,
      books: []
    });
  }
  render() {
    const { current, inited, done } = this.state;
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
        {current === searchKey && (
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
        {
          <div className="loadMore" ref={this.loadMoreRef}>
            {!done && (
              <div>
                <Icon type="appstore" />
                正在加载更多...
              </div>
            )}
          </div>
        }
      </div>
    );
  }
}

export default Home;
