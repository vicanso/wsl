import React from "react";
import {
  message,
  Table,
  Card,
  Input,
  Spin,
  Row,
  Col,
  Form,
  Button
} from "antd";

import "./book_list.sass";
import * as bookService from "../../services/book";

const { Search, TextArea } = Input;

const updateMode = "update";

class BookList extends React.Component {
  state = {
    updateData: null,
    mode: "",
    current: null,
    submitting: false,
    loading: false,
    books: null,
    keyword: "",
    pagination: {
      current: 1,
      pageSize: 10,
      total: 0
    }
  };
  componentWillMount() {
    this.search();
  }
  async search() {
    const { loading, pagination } = this.state;
    if (loading) {
      return;
    }
    this.setState({
      loading: true
    });
    try {
      const offset = (pagination.current - 1) * pagination.pageSize;
      const data = await bookService.list({
        limit: pagination.pageSize,
        offset
      });
      const updateData = {
        books: data.books
      };
      if (data.count >= 0) {
        updateData.pagination = Object.assign(
          { ...pagination },
          {
            total: data.count
          }
        );
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
  async handleSubmit(e) {
    e.preventDefault();
    const { updateData, current } = this.state;
    if (!updateData) {
      message.info("请先修改再保存");
      return;
    }
    this.setState({
      submitting: true
    });
    try {
      await bookService.updateByID(current.id, updateData);
      const books = this.state.books.slice(0);
      books.forEach(item => {
        if (item.id === current.id) {
          Object.assign(item, updateData);
        }
      });
      this.setState({
        mode: "",
        books
      });
    } catch (err) {
      message.error(err.message);
    } finally {
      this.setState({
        submitting: false
      });
    }
  }
  renderTable() {
    const { books, pagination, mode } = this.state;
    if (mode === updateMode) {
      return;
    }
    const columns = [
      {
        width: "200px",
        title: "书名",
        dataIndex: "name",
        key: "name"
      },
      {
        width: "150px",
        title: "作者",
        dataIndex: "author",
        key: "author"
      },
      {
        title: "简介",
        dataIndex: "summary",
        key: "summary"
      },
      {
        title: "热度",
        dataIndex: "hot",
        key: "hot"
      },
      {
        title: "操作",
        width: "80px",
        render: (text, record) => {
          return (
            <span>
              <a
                href="/update"
                onClick={e => {
                  e.preventDefault();
                  this.setState({
                    updateData: null,
                    current: record,
                    mode: updateMode
                  });
                }}
              >
                更新
              </a>
            </span>
          );
        }
      }
    ];
    return (
      <Table
        rowKey={"id"}
        className="books"
        dataSource={books}
        columns={columns}
        pagination={pagination}
        onChange={pagination => {
          this.setState(
            {
              pagination: { ...pagination }
            },
            () => {
              this.search();
            }
          );
        }}
      />
    );
  }
  renderFiltes() {
    const { mode } = this.state;
    if (mode === updateMode) {
      return;
    }
    return (
      <Card title="书籍搜索" size="small">
        <div className="filter">
          <Search
            className="keyword"
            placeholder="请输入关键字"
            onSearch={keyword => {
              this.setState({
                keyword
              });
              this.search();
            }}
            enterButton
          />
        </div>
      </Card>
    );
  }
  renderUpdateEditor() {
    const { mode, submitting, current } = this.state;
    if (mode !== updateMode) {
      return;
    }
    return (
      <Card className="editor" title="更新书籍" size="small">
        <Form onSubmit={this.handleSubmit.bind(this)}>
          <Spin spinning={submitting}>
            <Row gutter={24}>
              <Col span={8}>
                <Form.Item label="书名">
                  <Input
                    disabled={true}
                    type="text"
                    defaultValue={current.name}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="作者">
                  <Input
                    disabled={true}
                    type="text"
                    defaultValue={current.author}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="热度">
                  <Input
                    type="number"
                    placeholder="请输入热度"
                    defaultValue={current.hot}
                    onChange={e => {
                      const updateData = this.state.updateData || {};
                      updateData.hot = e.target.valueAsNumber;
                      this.setState({
                        updateData
                      });
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item label="封面">
                  <Input
                    type="text"
                    defaultValue={current.cover}
                    placeholder="请输入书籍封面地址"
                    onChange={e => {
                      const updateData = this.state.updateData || {};
                      updateData.cover = e.target.value;
                      this.setState({
                        updateData
                      });
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item label="简介">
                  <TextArea
                    defaultValue={current.summary}
                    placeholder="请输入简介"
                    autosize={{
                      minRows: 4
                    }}
                    onChange={e => {
                      const updateData = this.state.updateData || {};
                      updateData.summary = e.target.value;
                      this.setState({
                        updateData
                      });
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Button type="primary" htmlType="submit">
                  更新
                </Button>
              </Col>
              <Col span={12}>
                <Button
                  onClick={() => {
                    this.setState({
                      mode: ""
                    });
                  }}
                >
                  返回
                </Button>
              </Col>
            </Row>
          </Spin>
        </Form>
      </Card>
    );
  }
  render() {
    return (
      <div className="BookList">
        {this.renderFiltes()}
        {this.renderTable()}
        {this.renderUpdateEditor()}
      </div>
    );
  }
}

export default BookList;
