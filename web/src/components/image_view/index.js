import React from "react";
import PropTypes from "prop-types";

class ImageView extends React.Component {
  state = {
    tips: "",
    width: 0,
    height: 0
  };
  viewRef = React.createRef();
  componentDidMount() {
    const { clientWidth, clientHeight } = this.viewRef.current;
    const { url } = this.props;
    const img = new Image();
    img.onload = () => {
      const { width, height } = img;
      let newWidth = 0;
      let newHeight = 0;
      if (height / clientHeight > width / clientWidth) {
        newHeight = clientHeight;
        newWidth = (clientHeight / height) * width;
      } else {
        newWidth = clientWidth;
        newHeight = (clientWidth / width) * height;
      }
      this.setState({
        width: newWidth,
        height: newHeight,
        tips: ""
      });
    };
    img.onerror = () => {
      this.setState({
        tips: "加载失败"
      });
    };
    img.src = url;
    this.setState({
      tips: "图片加载中..."
    });
  }
  renderImage() {
    const { url } = this.props;
    const { width, height } = this.state;
    if (!width || !height) {
      return;
    }
    return (
      <img
        alt={"cover"}
        src={url}
        width={width}
        height={height}
        style={{
          margin: "auto",
          display: "block"
        }}
      />
    );
  }
  render() {
    const { tips } = this.state;
    return (
      <div
        ref={this.viewRef}
        style={{
          height: "100%"
        }}
      >
        {tips && (
          <div
            style={{
              paddingTop: "30px",
              textAlign: "center"
            }}
          >
            {tips}
          </div>
        )}
        {this.renderImage()}
      </div>
    );
  }
}

ImageView.propTypes = {
  url: PropTypes.string.isRequired
};

export default ImageView;
