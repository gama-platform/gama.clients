import React from "react";


class SingleCharts extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      title: {
        text: "aaa"
      },
      color: "",
      val: 0
    };

    window.$gama.addOutput(this, this);
    this.title = props.props.title;
    this.expressions = props.props.expressions;
    this.state.title.text = (this.title);
    this.state.color = this.expressions[0].color;
    // let _this = this;
    // this.expressions.forEach((value, index, array) => {
    //   _this.state.series.push({
    //     data: [],
    //     name: value.label,
    //     color: value.color
    //   });
    // }
    // );
    this.update = this.update.bind(this);
    // this.updateSource = setInterval(() => {
    //   window.$gama.evalExpr(props.expr, function (ee) {
    //     // ee = JSON.parse(ee).result.replace(/[{}]/g, "");
    //     // var eee = ee.split(",");
    //     // console.log(eee[0]);
    //     // console.log(eee[1]);
    //   });
    // }, 1000);
  }

  reset(c) {

    this.setState({ val: 0 });
    // let _this = this;
    // this.expressions.forEach((value, index, array) => {
    //   _this.state.series.push({
    //     data: [],
    //     name: value.expr,
    //     color: value.color
    //   });
    // }
    // );
    // this.setState({ series: this.state.series });
  }

  update(c) {
    // console.log(this.expression);
    let _this = this;
    let ex = [];
    this.expressions.forEach((e) => ex.push(e.expr));
    //  console.log(ex.toString());
    window.$gama.evalExpr("[" + ex.toString() + "]", function (ee) {
      // console.log(JSON.parse(ee));

      if (JSON.parse(ee).content && JSON.parse(ee).type === "CommandExecutedSuccessfully") {

        try {

          ee = JSON.parse(ee).content.replace(/[[\]]/g, ""); 
  
          _this.state.val = ee; 
          _this.setState({ series: _this.state.series });
        } catch (e) {
          console.log(e + " " + (ex) + " " + (JSON.parse(ee).command));
          // console.log((JSON.parse(ee).command));
        }
      }
      if (c) {
        c();
        // console.log("callback chart");
        // console.log((JSON.parse(ee)));
      }
    });
  }
  componentWillUnmount() {

    window.$gama.outputs.delete(this);
    // console.log(window.$gama.outputs);
  }
  componentDidMount() {

    // _this.interval = setInterval(function () {
    // }, 2000);
  }
  render() {
    return (
      <div className="singleM">
        <div>
          {this.title}
        </div>
        <div style={{ fontSize: '72px', fontWeight: '900', color: `rgba(${this.state.color.r}, ${this.state.color.g}, ${this.state.color.b}, ${this.state.color.a})` }}>{this.state.val}</div>
      </div>
    );
  }
}

export default SingleCharts;
