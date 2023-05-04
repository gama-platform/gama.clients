import React, { useRef, useState } from 'react'
import 'primereact/resources/themes/lara-light-indigo/theme.css';   // theme
import 'primereact/resources/primereact.css';                       // core css
import 'primeicons/primeicons.css';                                 // icons 

import { useFormik } from 'formik';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { classNames } from 'primereact/utils';
import { Toast } from 'primereact/toast';

class Modeling extends React.Component {
  constructor(param) {
    super(param);
    // this.mySelRef = React.createRef();
    this.item = "";
    this.state = {
      loading: false,
    };
    this.id = "m" + param.id;
    this.loading = false;
    // console.log(this.props);
    // this.props.gama.editor = this; 
    window.$gama.editor=this;
  }


  render() {

    const toast = this.props.toast;
    const formik = this.props.formik;
    const isFormFieldInvalid = this.props.isFormFieldInvalid;
    const getFormErrorMessage = this.props.getFormErrorMessage;


    return (
      <div className="card flex justify-content-center">
        <form onSubmit={formik.handleSubmit} className="flex flex-column gap-2">
          <Toast ref={toast} />
          <table><tbody>
            <tr><td>
              <Button label="Launch" type="submit" icon="pi pi-check" /></td></tr>
            <tr><td><InputTextarea
              inputid="description"
              name="description"
              rows={30}
              cols={60}
              className={classNames({ 'p-invalid': isFormFieldInvalid('description') })}
              value={formik.values.description}
              onChange={(e) => {
                formik.setFieldValue('description', e.target.value);
              }}
            /></td></tr>
          </tbody></table>

          {/* {getFormErrorMessage('description')} */}
        </form>
      </div>
    );
  }

}
// export default NavigationBar;


export default (props) => {

  const toast = useRef(null);

  const show = () => {
    toast.current.show({ severity: 'success', summary: 'Model launch', detail: "Saved" });
  };

  const formik = useFormik({
    initialValues: {
      description: ''
    },
    validate: (data) => {
      let errors = {};

      if (!data.description) {
        errors.description = 'Description is required.';
      }

      return errors;
    },
    onSubmit: (data) => {
      // data && show(); 
      // console.log(props.gama.current);
      props.gama.current.push(props.gama.current.modelPath, data.description, (e) => {
        data && show();
        var ee = JSON.parse(e).content;
        console.log(ee);
        tryLaunch(data.path);
      });
      // formik.resetForm();
    }
  });

  const tryLaunch = (path) => {
    // if (!this.gama.current.wSocket) {
    //   this.tryConnect();
    // }
    // console.log(props.gama.current);
    if (props.gama.current && props.gama.current.wSocket && props.gama.current.wSocket.readyState === 1) {
      // this.setState((prevState) => ({
      //     loaded: false
      // }));
      // this.props.grid.waiting(true);
      // this.waiting(true);
      // console.log(this.mySelRef);
      // console.log(this.mySelRef.props.inputValue); 
      // console.log((options_model.find(obj => obj.label === this.mySelRef.props.inputValue))); 
      // var mm = (options_model.find(obj => obj.label === this.mySelRef.props.inputValue));
      // if (mm === undefined) {
      //     mm = this.mySelRef.props.inputValue;
      // } else {
      //     mm = mm.value;
      // }
      // var mm = props.gama.current.rootPath + "/" + this.item;
      var mm=path;
      props.gama.current.modelPath = mm.split("|")[0];
      props.gama.current.experimentName = mm.split("|")[1];
      // console.log( props.gama.current.modelPath);
      // console.log( props.gama.current.experimentName);

      // var modelPath = 'C:/git/gama/msi.gama.models/models/Tutorials/Road Traffic/models/Model 05.gaml';
      // var experimentName = 'road_traffic';
      var _this = this;

      props.gama.current.stop(() => {
        props.gama.current.launch((e) => {
          // console.log(e);
          if (e.type === "CommandExecutedSuccessfully") {
            window.$loaded = true;
            // this.setState((prevState) => ({
            //     loaded: true
            // }));
            toast.current.show({ severity: 'success', summary: 'Loaded', detail: mm });
            console.log("loaded ");
            tryGenParam();
          }
          // this.props.grid.waiting(false);
          // this.waiting(false);
        });
      });
      // this.gama.current.launch(_this.tryPlay);

    }
    // window.$gama.doConnect();
  }


  const tryGenParam = () => {

    if (props.gama.current && props.gama.current.wSocket) {// && this.gama.current.wSocket.readyState!==1 

      var _this = this;
      props.gama.current.evalExpr("experiment.parameters.pairs", function (ee) {

        if (JSON.parse(ee).content && JSON.parse(ee).type === "CommandExecutedSuccessfully") {
          props.gama.current.grid.remParam();
          props.gama.current.grid.addWidget();
          props.gama.current.grid.addParam(ee);

          // _this.setState(({
          //   loading: false
          // }));
        }
      });
    }
  }
  const isFormFieldInvalid = (name) => !!(formik.touched[name] && formik.errors[name]);

  const getFormErrorMessage = (name) => {
    return isFormFieldInvalid(name) ? <small className="p-error">{formik.errors[name]}</small> : <small className="p-error">&nbsp;</small>;
  };

  // console.log(props);
  return (
    <Modeling toast={toast} formik={formik} isFormFieldInvalid={isFormFieldInvalid} getFormErrorMessage={getFormErrorMessage} gama={props.gama} editor={props.editor}/>
  )
}