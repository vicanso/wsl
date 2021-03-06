import React from "react";

import { Menu, Icon } from "antd";
import { Link, withRouter } from "react-router-dom";

import {
  USER_PATH,
  USER_LOGIN_RECORDS_PATH,
  ALL_BOOK_PATH,
  ALL_CONFIG_PATH,
  BASIC_CONFIG_PATH,
  IP_BLOCK_CONFIG_PATH,
  ROUTER_CONFIG_PATH,
  SIGNED_KEYS_CONFIG_PATH
} from "../../paths";
import "./app_menu.sass";

const { SubMenu } = Menu;

const configMenu = {
  key: "configuration",
  title: (
    <span>
      <Icon type="setting" />
      <span>配置</span>
    </span>
  ),
  children: [
    {
      key: "all-config",
      url: ALL_CONFIG_PATH,
      title: "所有配置"
    },
    {
      key: "basic-config",
      url: BASIC_CONFIG_PATH,
      title: "基本配置"
    },
    {
      key: "router-config",
      url: ROUTER_CONFIG_PATH,
      title: "路由配置"
    },
    {
      key: "signed-keys-config",
      url: SIGNED_KEYS_CONFIG_PATH,
      title: "签名配置"
    },
    {
      key: "ip-block-config",
      url: IP_BLOCK_CONFIG_PATH,
      title: "黑名单IP"
    }
  ]
};

const userMenu = {
  key: "user",
  title: (
    <span>
      <Icon type="user" />
      <span>用户</span>
    </span>
  ),
  children: [
    {
      key: "users",
      url: USER_PATH,
      title: "用户列表"
    },
    {
      key: "users-login-records",
      url: USER_LOGIN_RECORDS_PATH,
      title: "用户登录查询"
    }
  ]
};

const bookMenu = {
  key: "book",
  title: (
    <span>
      <Icon type="book" />
      <span>书籍</span>
    </span>
  ),
  children: [
    {
      key: "books",
      url: ALL_BOOK_PATH,
      title: "书籍列表"
    }
  ]
};

class AppMenu extends React.Component {
  state = {
    defaultOpenKeys: null,
    defaultSelectedKeys: null
  };
  constructor(props) {
    super(props);
    const { pathname } = props.location;
    const defaultSelectedKeys = [];
    const defaultOpenKeys = [];
    [configMenu, userMenu, bookMenu].forEach(menu => {
      menu.children.forEach(item => {
        if (item.url === pathname) {
          defaultSelectedKeys.push(item.key);
          defaultOpenKeys.push(menu.key);
        }
      });
    });

    this.state.defaultSelectedKeys = defaultSelectedKeys;
    this.state.defaultOpenKeys = defaultOpenKeys;
  }
  renderMenus(data) {
    const arr = data.children.map(item => {
      return (
        <Menu.Item key={item.key}>
          <Link to={item.url}>{item.title}</Link>
        </Menu.Item>
      );
    });
    return (
      <SubMenu key={data.key} title={data.title}>
        {arr}
      </SubMenu>
    );
  }
  renderConfigMenus() {
    return this.renderMenus(configMenu);
  }
  renderUserMenus() {
    return this.renderMenus(userMenu);
  }
  renderBookMenus() {
    return this.renderMenus(bookMenu);
  }
  render() {
    const { defaultSelectedKeys, defaultOpenKeys } = this.state;
    return (
      <div className="AppMenu">
        <Menu
          mode="inline"
          theme="dark"
          defaultOpenKeys={defaultOpenKeys}
          defaultSelectedKeys={defaultSelectedKeys}
        >
          {this.renderConfigMenus()}
          {this.renderUserMenus()}
          {this.renderBookMenus()}
        </Menu>
      </div>
    );
  }
}

export default withRouter(AppMenu);
