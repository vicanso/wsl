import { isLangTC, langTC } from "./helpers/util";
let urlPrefix = "";
if (isLangTC()) {
  urlPrefix = `/${langTC}`;
}

export const ADMIN_PATH = `${urlPrefix}/admin`;
export const ALL_CONFIG_PATH = `${urlPrefix}/config/all`;
export const BASIC_CONFIG_PATH = `${urlPrefix}/config/basic`;
export const SIGNED_KEYS_CONFIG_PATH = `${urlPrefix}/config/signed-keys`;
export const ROUTER_CONFIG_PATH = `${urlPrefix}/config/router`;
export const IP_BLOCK_CONFIG_PATH = `${urlPrefix}/config/ip-block`;

export const LOGIN_PATH = `${urlPrefix}/user/login`;
export const REGISTER_PATH = `${urlPrefix}/user/register`;
export const USER_PATH = `${urlPrefix}/user`;
export const USER_LOGIN_RECORDS_PATH = `${urlPrefix}/user/login-records`;

export const HOME_PATH = `${urlPrefix}/`;
export const BOOK_DETAIL_PATH = `${urlPrefix}/book/:id`;
export const BOOK_CHAPTER_PATH = `${urlPrefix}/book/:id/chapter/:no`;
export const ALL_BOOK_PATH = `${urlPrefix}/book/all`;

export const SC_HOME_PATH = "/";
export const TC_HOME_PAHT = `/${langTC}/`;
