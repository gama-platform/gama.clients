import React from 'react'

import { Container } from "reactstrap";
import Grid from "./Grid";
import ModelingBar from "./Modeling";
import OptionsBar from "./Options";
import NavigatorBar from "./Navigator";

import { Layout, Model } from "flexlayout-react";

import { flex_layout_default } from '../assets/layout.js';
import 'flexlayout-react/style/light.css';
const model = Model.fromJson(flex_layout_default);
function TabLayout(props) {
  // class TabLayout extends React.Component {
  //   constructor(param) {
  //     super(param);
  //     // this.mySelRef = React.createRef();
  //     this.item = "";
  //     this.state = {
  //       model: Model.fromJson(flex_layout_default),
  //       loading: false,
  //     }; 
  //     this.id = "m" + param.id;
  //     this.loading = false;
  //     // console.log(this.props.login);
  //     this.login=this.props.login;
  //     // this.props.gama.editor = this;
  //   } 
  const editor_nav_link_ref = React.useRef(null);
  const editor_grid_link_ref = React.useRef(null);
 
  const factory = (node) => {
    var component = node.getComponent();

    if (component === "Simulation") {
      return <Container fluid={true}>

        <Grid style={{
  display: 'inline-block',
  padding: '20px 10px'
}} gama={props.gama} editor_grid_link_ref={editor_grid_link_ref} ></Grid>

      </Container>;
    }
    if (component === "Modeling") {
      return <ModelingBar gama={props.gama} editor_nav_link_ref={editor_nav_link_ref} editor_grid_link_ref={editor_grid_link_ref} />;
    }
    if (component === "Navigation") {
      return <NavigatorBar gama={props.gama} editor_nav_link_ref={editor_nav_link_ref}/>;//gama={this.props.gama}
    }
    if (component === "Options") {
      return <OptionsBar gama={props.gama} />;//
    }
  }
  return (
    <div className="App">
      <Layout
        model={model}
        factory={factory.bind(this)} />
    </div>
  );

}
export default TabLayout;

