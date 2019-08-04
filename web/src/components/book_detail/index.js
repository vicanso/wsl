import React from "react";
import { Spin, message, PageHeader, Icon } from "antd";
import { Link } from "react-router-dom";

import { BOOK_CHAPTER_PATH, HOME_PATH } from "../../paths";
import "./book_detail.sass";
import * as bookService from "../../services/book";

class BookDetail extends React.Component {
  state = {
    id: "",
    loading: false,
    detail: null,
    readInfo: null,
    chapters: []
  };
  constructor(props) {
    super(props);
    const { params } = props.match;
    const { id } = params;
    this.state.id = Number.parseInt(id);
  }
  async fetchDetail() {
    const { id } = this.state;
    this.setState({
      loading: true
    });
    try {
      const data = await bookService.detail(id);
      this.setState({
        detail: data
      });
    } catch (err) {
      message.error(err.message);
    } finally {
      this.setState({
        loading: false
      });
    }
  }
  async loadChapters(offset) {
    const { id } = this.state;
    try {
      const limit = 20;
      const data = await bookService.listChapters(id, {
        limit,
        offset,
        fields: "id,no,title,word_count"
      });
      const arr = this.state.chapters.slice(0).concat(data.chapters || []);
      this.setState({
        chapters: arr
      });
      // 如果章节刚好等于所要获取数量，则可能还有后续章节
      if (arr.length === offset + limit) {
        this.loadChapters(offset + limit);
      }
    } catch (err) {
      message.error(err.message);
    }
  }
  async componentWillMount() {
    const { id } = this.state;
    const readInfo = await bookService.getRead(id);
    this.setState({
      readInfo
    });
    this.fetchDetail();
    this.loadChapters(0);
  }
  renderDetail() {
    const { detail } = this.state;
    if (!detail) {
      return;
    }
    return (
      <div className="detail">
        <div className="cover"></div>
        <div className="content">
          <p>{detail.summary || "暂无简介"}</p>
        </div>
      </div>
    );
  }
  renderChapters() {
    const { chapters, id } = this.state;
    if (!chapters || chapters.length === 0) {
      return;
    }
    const arr = chapters.map(item => {
      const url = BOOK_CHAPTER_PATH.replace(":id", id).replace(
        ":no",
        item.no || 0
      );
      return (
        <li key={item.id}>
          <Link to={url}>{item.title}</Link>
        </li>
      );
    });
    return (
      <div className="chapters">
        <h5>章节列表</h5>
        <ul>{arr}</ul>
      </div>
    );
  }
  renderGoOnReading() {
    const { id, chapters, readInfo } = this.state;
    if (!readInfo) {
      return;
    }
    const url = BOOK_CHAPTER_PATH.replace(":id", id).replace(
      ":no",
      readInfo.chapterIndex
    );
    let title = null;
    chapters.forEach(item => {
      if (item.no === readInfo.chapterIndex) {
        title = <span> {item.title}</span>;
      }
    });
    return (
      <Link to={url} className="goOnReading">
        <Icon type="tags" />
        继续阅读
        {title}
      </Link>
    );
  }
  render() {
    const { history } = this.props;
    const { loading, detail } = this.state;
    return (
      <div className="BookDetail">
        <PageHeader
          onBack={() => history.push(HOME_PATH)}
          title={detail && detail.name}
          subTitle={detail && detail.author}
        />
        {loading && (
          <div className="loadingWrapper">
            <Spin tip={"加载中"} />
          </div>
        )}
        {this.renderDetail()}
        {this.renderGoOnReading()}
        {this.renderChapters()}
      </div>
    );
  }
}

export default BookDetail;
