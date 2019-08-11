import React from "react";
import { Button, Icon, message, Spin, PageHeader, Modal } from "antd";
import { throttle } from "throttle-debounce";

import { BOOK_CHAPTER_PATH } from "../../paths";
import "./chapter_detail.sass";
import * as bookService from "../../services/book";

const ButtonGroup = Button.Group;

class ChapterDetail extends React.Component {
  state = {
    name: "",
    showReloadDialog: false,
    showFunctions: false,
    loading: false,
    id: 0,
    chapterCount: 0,
    no: 0
  };
  contentRef = React.createRef();
  constructor(props) {
    super(props);
    const { id, no } = props.match.params;
    this.state.id = Number.parseInt(id);
    this.state.no = Number.parseInt(no);
  }
  async fetchDetail() {
    const { id } = this.state;
    try {
      const data = await bookService.detail(id);
      this.setState({
        name: data.name,
        chapterCount: data.chapterCount
      });
    } catch (err) {
      message.error(err.message);
    }
  }
  async componentWillMount() {
    try {
      await this.fetchDetail();
      await this.fetchChapterContent();
    } finally {
      window.addEventListener(
        "scroll",
        throttle(1000, () => {
          const { state, contentRef } = this;
          if (state.showFunctions || !contentRef.current) {
            return;
          }
          const scrollTop =
            window.document.documentElement.scrollTop ||
            window.document.body.scrollTop;
          const height = this.contentRef.current.clientHeight;
          if (scrollTop + window.innerHeight > height - 80) {
            this.setState({
              showFunctions: true
            });
          }
        })
      );
    }
  }
  componentWillReceiveProps(newProps) {
    const { no } = newProps.match.params;
    if (this.state.no !== Number.parseInt(no)) {
      this.setState(
        {
          no: Number.parseInt(no)
        },
        () => {
          this.fetchChapterContent();
        }
      );
    }
  }
  async fetchChapterContent() {
    const { id, no, loading, name } = this.state;
    if (loading) {
      return;
    }

    this.setState({
      loading: true
    });
    try {
      let startdAt = Date.now();
      const delay = () => {
        const ms = 300 - (Date.now() - startdAt);
        if (ms < 0) {
          return Promise.resolve();
        }
        return new Promise(resolve => setTimeout(resolve, ms));
      };

      const current = await bookService.getChapterContent(id, no);
      if (!current) {
        throw new Error("获取章节内容失败");
      }
      await delay();
      this.setState({
        showFunctions: false,
        current
      });
      bookService.setRead({
        id,
        name,
        no: no || 0,
        title: current.title
      });
    } catch (err) {
      message.error(err.message);
      this.setState({
        showReloadDialog: true
      });
    } finally {
      this.setState({
        loading: false
      });
    }
  }
  renderFunctions() {
    const { history } = this.props;
    const { no, id, chapterCount, showFunctions, current, name } = this.state;
    if (!showFunctions) {
      return;
    }
    const disablePrev = no === 0;
    const disableNext = no >= chapterCount - 1;
    const go = newNo => {
      const url = BOOK_CHAPTER_PATH.replace(":id", id).replace(":no", newNo);
      history.replace(url);
    };
    return (
      <div
        className="functions"
        onClick={e => {
          // 只点击functions空白处切换
          if (e.target.className !== "functions") {
            return;
          }
          this.setState({
            showFunctions: false
          });
        }}
      >
        <PageHeader
          title={current && current.title}
          subTitle={name}
          onBack={() => {
            history.goBack();
          }}
        />
        <div className="btns">
          <ButtonGroup>
            <Button
              size="large"
              disabled={disablePrev}
              type="primary"
              onClick={() => {
                go(no - 1);
              }}
            >
              <Icon type="left" />
              上一章
            </Button>
            <Button
              size="large"
              disabled={disableNext}
              type="primary"
              onClick={() => {
                go(no + 1);
              }}
            >
              下一章
              <Icon type="right" />
            </Button>
          </ButtonGroup>
        </div>
      </div>
    );
  }
  renderContent() {
    const { current, no, showFunctions } = this.state;
    if (!current) {
      return;
    }
    const list = current.content.split("\n").map((item, index) => {
      return <p key={`${no}-${index}`}>{item}</p>;
    });
    return (
      <div
        ref={this.contentRef}
        className="content"
        onClick={() => {
          this.setState({
            showFunctions: !showFunctions
          });
        }}
      >
        <h2>{current.title}</h2>
        {list}
      </div>
    );
  }
  render() {
    const { history } = this.props;
    const { loading, showReloadDialog } = this.state;
    return (
      <div className="ChapterDetail">
        {loading && (
          <div className="loadingWrapper">
            <Spin tip={"加载中"} />
          </div>
        )}
        {!loading && this.renderContent()}
        {!loading && this.renderFunctions()}
        <Modal
          title="加载失败啦~"
          visible={showReloadDialog}
          okText={"确定"}
          cancelText={"返回"}
          onOk={() => {
            this.fetchChapterContent();
            this.setState({
              showReloadDialog: false
            });
          }}
          onCancel={() => {
            this.setState({
              showReloadDialog: false
            });
            history.goBack();
          }}
        >
          <p>加载失败，是否重新加载？</p>
        </Modal>
      </div>
    );
  }
}

export default ChapterDetail;
