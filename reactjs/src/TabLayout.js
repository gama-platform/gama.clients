import React, { useRef, useState } from 'react'

import { Container } from "reactstrap";
import Grid from "./Grid";
import OptionsBar from "./Options";
import NavigatorBar from "./Navigator";
import ModelingBar from "./Modeling";

import { Layout, Model } from "flexlayout-react";

import { flex_layout_default } from './assets/layout.js';
import 'flexlayout-react/style/light.css';

class TabLayout extends React.Component {
  constructor(param) {
    super(param);
    // this.mySelRef = React.createRef();
    this.item = "";
    this.state = {
      model: Model.fromJson(flex_layout_default),
      loading: false,
    }; 
    this.id = "m" + param.id;
    this.loading = false;
    // console.log(this.props.login);
    this.login=this.props.login;
    // this.props.gama.editor = this;
  }

  factory = (node) => {
    var component = node.getComponent();
    // var mygrid = React.createRef();
    if (component === "Simulation") {
      return <Container fluid={true}>

        <Grid gama={this.props.gama}></Grid>

      </Container>;
    }
    if (component === "Modeling") {
      return <ModelingBar gama={this.props.gama} />;
    }
    if (component === "Navigation") {
      return <NavigatorBar gama={this.props.gama}  />;
    }
    if (component === "Options") {
      return <OptionsBar gama={this.props.gama} login={this.props.login}/>;
    }
  }
  render() {
    // console.log(this.login);
    //   console.log(this.login?this.login.state.isLoggedIn:"" );
    
    // if(!this.props.login.isLoggedIn){
    //   return "";
    // }
    return (
      <div className="App">
        <Layout
          model={this.state.model}
          factory={this.factory.bind(this)} />
      </div>
    );
  }

}
export default TabLayout;

