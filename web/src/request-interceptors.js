import request from "axios";

request.interceptors.request.use(config => {
  if (!config.timeout) {
    config.timeout = 10 * 1000;
  }
  return config;
});

request.interceptors.response.use(null, err => {
  const { response, code } = err;
  if (code === "ECONNABORTED") {
    err.message = "很抱歉，请求超时，请再次重试。";
  } else if (response) {
    if (response.data && response.data.message) {
      err.message = response.data.message;
    } else {
      err.message = `未知异常[${response.statusCode || -1}]`;
    }
  }
  return Promise.reject(err);
});
