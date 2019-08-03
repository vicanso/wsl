import React from "react";
import { Route, BrowserRouter } from "react-router-dom";
import axios from "axios";
import { message, Spin } from "antd";

import "./app.sass";
import {
  HOME_PATH,
  BOOK_DETAIL_PATH,
  BOOK_CHAPTER_PATH,
  ALL_BOOK_PATH,
  ADMIN_PATH,
  ALL_CONFIG_PATH,
  BASIC_CONFIG_PATH,
  SIGNED_KEYS_CONFIG_PATH,
  ROUTER_CONFIG_PATH,
  IP_BLOCK_CONFIG_PATH,
  REGISTER_PATH,
  LOGIN_PATH,
  USER_PATH,
  USER_LOGIN_RECORDS_PATH
} from "./paths";
import { USERS_ME } from "./urls";
import AppMenu from "./components/app_menu";
import AppHeader from "./components/app_header";
import BasicConfig from "./components/basic_config";
import SignedKeysConfig from "./components/signed_keys_config";
import Login from "./components/login";
import Register from "./components/register";
import RouterConfig from "./components/router_config";
import ConfigList from "./components/config_list";
import UserList from "./components/user_list";
import UserLoginRecordList from "./components/user_login_record_list";
import Home from "./components/home";
import BookDetail from "./components/book_detail";
import ChapterDetail from "./components/chapter_detail";
import BookList from "./components/book_list";
import IPBlockList from "./components/ip_block_list";

function NeedLoginRoute({ component: Component, account, isAdmin, ...rest }) {
  return (
    <Route
      {...rest}
      render={props => {
        const { history } = props;
        if (!account) {
          history.push(LOGIN_PATH);
          return;
        }
        return <Component {...props} account={account} isAdmin={isAdmin} />;
      }}
    />
  );
}

class App extends React.Component {
  state = {
    loading: false,
    account: "",
    isAdmin: false
  };
  async componentWillMount() {
    this.setState({
      loading: true
    });
    try {
      const { data } = await axios.get(USERS_ME);
      this.setUserInfo(data);
    } catch (err) {
      message.error(err.message);
    } finally {
      this.setState({
        loading: false
      });
    }
    // 更新session与cookie有效期
    setTimeout(() => {
      axios.patch(USERS_ME);
    }, 5 * 1000);
  }
  setUserInfo(data) {
    let isAdmin = false;
    (data.roles || []).forEach(item => {
      if (item === "su" || item === "admin") {
        isAdmin = true;
      }
    });
    this.setState({
      account: data.account || "",
      isAdmin
    });
  }
  renderAdminPage() {
    const { account, isAdmin, loading } = this.state;
    return (
      <BrowserRouter basename={ADMIN_PATH}>
        <AppMenu />
        {loading && (
          <div className="loadingWrapper">
            <Spin tip="加载中..." />
          </div>
        )}
        {!loading && (
          <div className="contentWrapper">
            <AppHeader
              account={account}
              setUserInfo={this.setUserInfo.bind(this)}
            />

            <Route
              path={LOGIN_PATH}
              render={props => (
                <Login {...props} setUserInfo={this.setUserInfo.bind(this)} />
              )}
            />
            <Route path={REGISTER_PATH} component={Register} />
            <NeedLoginRoute
              path={ALL_CONFIG_PATH}
              component={ConfigList}
              account={account}
              isAdmin={isAdmin}
            />
            <NeedLoginRoute
              path={BASIC_CONFIG_PATH}
              component={BasicConfig}
              account={account}
              isAdmin={isAdmin}
            />
            <NeedLoginRoute
              path={SIGNED_KEYS_CONFIG_PATH}
              component={SignedKeysConfig}
              account={account}
              isAdmin={isAdmin}
            />
            <NeedLoginRoute
              path={ROUTER_CONFIG_PATH}
              component={RouterConfig}
              account={account}
              isAdmin={isAdmin}
            />
            <NeedLoginRoute
              exact
              path={USER_PATH}
              component={UserList}
              account={account}
              isAdmin={isAdmin}
            />
            <NeedLoginRoute
              path={USER_LOGIN_RECORDS_PATH}
              component={UserLoginRecordList}
              account={account}
              isAdmin={isAdmin}
            />
            <NeedLoginRoute
              path={ALL_BOOK_PATH}
              component={BookList}
              account={account}
              isAdmin={isAdmin}
            />
            <NeedLoginRoute
              path={IP_BLOCK_CONFIG_PATH}
              component={IPBlockList}
              account={account}
              isAdmin={isAdmin}
            />
          </div>
        )}
      </BrowserRouter>
    );
  }
  render() {
    return (
      <div className="App">
        <Route path={ADMIN_PATH} render={() => this.renderAdminPage()} />
        <Route path={HOME_PATH} exact component={Home} />
        <Route path={BOOK_DETAIL_PATH} exact component={BookDetail} />
        <Route path={BOOK_CHAPTER_PATH} component={ChapterDetail} />
      </div>
    );
  }
}

export default App;
