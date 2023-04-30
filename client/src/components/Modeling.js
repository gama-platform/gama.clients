import React, { useRef } from 'react'
import 'primereact/resources/themes/lara-light-indigo/theme.css';   // theme
import 'primereact/resources/primereact.css';                       // core css
import 'primeicons/primeicons.css';                                 // icons 

import { useFormik } from 'formik';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { classNames } from 'primereact/utils';
import { Toast } from 'primereact/toast';

function Modeling(props) {
  // class Modeling extends React.Component {
  //   constructor(param) {
  //     super(param);
  //     // this.mySelRef = React.createRef();
  //     this.item = "";
  //     this.state = {
  //       loading: false,
  //     };
  //     this.id = "m" + param.id;
  //     this.loading = false;
  //     // console.log(this.props);
  //     // this.props.gama.editor = this; 
  //     window.$gama.editor=this;
  //   }


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
    // console.log(props.gama.current.wSocket);
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
      var mm = path;
      props.gama.current.modelPath = mm.split("|")[0];
      props.gama.current.experimentName = mm.split("|")[1];
      // console.log( props.gama.current.modelPath);
      // console.log( props.gama.current.experimentName);

      // var modelPath = 'C:/git/gama/msi.gama.models/models/Tutorials/Road Traffic/models/Model 05.gaml';
      // var experimentName = 'road_traffic'; 

      props.gama.current.stop(() => {
        props.gama.current.launch((e) => {
          // console.log(e);
          if (e.type === "CommandExecutedSuccessfully") {
            // window.$loaded = true;
            // this.setState((prevState) => ({
            //     loaded: true
            // }));
            tryGenParam(mm);
          }
          // this.props.grid.waiting(false);
          // this.waiting(false);
        });
      });
      // this.gama.current.launch(_this.tryPlay);

    }
    // window.$gama.doConnect();
  }


  const tryGenParam = (mm) => {

    if (props.gama.current && props.gama.current.wSocket) {// && this.gama.current.wSocket.readyState!==1 

      props.gama.current.evalExpr("experiment.parameters.pairs", function (ee) {

        // console.log("tryGenParam "+ee);
        if (JSON.parse(ee).content && JSON.parse(ee).type === "CommandExecutedSuccessfully") {

          props.editor_grid_link_ref.current(ee);
          toast.current.show({ severity: 'success', summary: 'Loaded', detail: mm });
          console.log("loaded ");
          // props.gama.current.grid.remParam();
          // props.gama.current.grid.addWidget();
          // props.gama.current.grid.addParam(ee);

          // _this.setState(({
          //   loading: false
          // }));
        }
      });
    }
  }
  const isFormFieldInvalid = (name) => !!(formik.touched[name] && formik.errors[name]);

  // const getFormErrorMessage = (name) => {
  //   return isFormFieldInvalid(name) ? <small className="p-error">{formik.errors[name]}</small> : <small className="p-error">&nbsp;</small>;
  // };


  const editModelMethod = React.useCallback((ee) => {
    // console.log('I am a Child 1 method!!!');
    // console.log(ee);
    // props.gama.editor.props.formik.resetForm();
    // props.gama.editor.props.formik.setFieldValue('path', mm);
    // props.gama.editor.props.formik.setFieldValue('description', ee);
    formik.resetForm();
    formik.setFieldValue('path', ee[0]);
    formik.setFieldValue('description', ee[1]);
    formik.setFieldValue('title', ee[2]);
  }, [formik]);

  React.useEffect(() => {
    props.editor_nav_link_ref.current = editModelMethod
  }, [editModelMethod, props.editor_nav_link_ref]);

  return (
    <div className="card flex justify-content-center" >
      <form onSubmit={formik.handleSubmit} className="flex flex-column gap-2">
        <Toast ref={toast} />
        <table style={{ textAlign: "left", width: '100%' }}><tbody>
          <tr><td>
            <Button size="small" label="Launch" type="submit" icon="pi pi-check" />
          </td></tr>
          <tr><td>{formik.values.title}</td></tr>
          <tr><td>

            <div style={{ height: '880px', overflow: 'auto' }}> <InputTextarea
              style={{ width: '100%' }}
              inputid="description"
              rows={35}
              name="description" autoResize
              className={classNames({ 'p-invalid': isFormFieldInvalid('description') })}
              value={formik.values.description}
              onChange={(e) => {
                formik.setFieldValue('description', e.target.value);
              }}
            />

            </div>
          </td></tr>
        </tbody></table>
        {/* {getFormErrorMessage('description')} */}
      </form>
    </div >
  );
}

export default Modeling; 