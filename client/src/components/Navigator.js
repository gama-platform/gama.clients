import React, { useRef, useState } from 'react'
import 'primereact/resources/themes/lara-light-indigo/theme.css';   // theme
import 'primereact/resources/primereact.css';                       // core css
import 'primeicons/primeicons.css';                                 // icons 

import { useFormik } from 'formik';
import { ListBox } from 'primereact/listbox';
import { ConfirmPopup } from 'primereact/confirmpopup'; // To use <ConfirmPopup> tag
// import { confirmPopup } from 'primereact/confirmpopup'; // To use confirmPopup method

import Files from 'react-files'

import { Toast } from 'primereact/toast';
import { models } from '../assets/data.js';

function NavigationBar(props) {
  // class NavigationBar extends React.Component {
  //   constructor(param) {
  //     super(param);
  //     // this.mySelRef = React.createRef();
  //     this.item = "";
  //     this.state = {
  //       loading: false,
  //     };
  //     this.id = "m" + param.id;
  //     this.loading = false;
  //     this.tryEdit = this.tryEdit.bind(this);

  //   }


  const [loading, setLoading] = useState(false);

  const toast = useRef(null);

  const show = (e) => {
    toast.current.show({ severity: 'success', summary: 'Experiment', detail: e });
  };

  const formik = useFormik({
    initialValues: {
      item: ''
    },
    validate: (data) => {
      let errors = {};

      if (!data.item) {
        errors.item = 'City is required.';
      }

      return errors;
    },
    onSubmit: (data) => {
      data.item && show(formik.values.item.name + " " + formik.values.item.code);
      formik.resetForm();
    }
  });

  const tryEdit = (item) => {
    // console.log(props);
    setLoading(false);
    // if (props.gama.editor) {
    if (props.editor_nav_link_ref && item) {

      var mm = props.gama.current.rootPath + "/" + item.code;

      // console.log(props.gama.current.rootPath);
      props.gama.current.modelPath = mm.split("|")[0];
      // console.log("edit " + this.props.gama.modelPath);
      // console.log(this.props.gama.editor.props.formik);
      props.gama.current.fetch(props.gama.current.modelPath, (e) => {
        var ee = JSON.parse(e).content;

        props.editor_nav_link_ref.current([mm, ee,item.code]);
        // console.log(ee);
        // props.gama.editor.item = mm;
        // props.gama.editor.props.formik.resetForm();
        // props.gama.editor.props.formik.setFieldValue('path', mm);
        // props.gama.editor.props.formik.setFieldValue('description', ee);
      });

    }
  }


  // const accept = () => {
  //   toast.current.show({ severity: 'info', summary: 'Confirmed', detail: 'Experiment ' + formik.values.item.code, life: 3000 });
  // };

  // const reject = () => {
  //   // toast.current.show({ severity: 'warn', summary: 'Rejected', detail: 'You have rejected', life: 3000 });
  // };
  // const confirm1 = (event) => {
  //   confirmPopup({
  //     target: event.currentTarget,
  //     message: 'Are you sure you want to launch?',
  //     icon: 'pi pi-exclamation-triangle',
  //     accept,
  //     reject
  //   });
  // };
  // console.log(props.gama.current);
  const treeData= [{ title: 'src/', children: [{ title: 'index.js' }] }];
    
   return (
    <form onSubmit={formik.handleSubmit} className="flex flex-column align-items-left">
      {/* <Button type="submit" label="Launch"  /> */}
      <Toast ref={toast} />
      <ConfirmPopup />
      <div style={{textAlign:'left'}}>
        
      </div>
      <ListBox
        id="item"
        name="item"
        filter
        value={formik.values.item}
        options={models}
        disabled={loading}
        optionLabel="name"
        placeholder="Select a Experiment"
        onChange={(e) => {
          formik.setFieldValue('item', e.value);
          tryEdit( e.value);
          // console.log(e.value);
          // console.log(this.item);
          // show(e.value.code);
          // confirm1(e);
        }}
        // onClick={(e) => {
        //   switch (e.detail) {
        //     case 2:

        //       // console.log(this.props.gama); 
        //       // formik.setFieldValue('item', e.value);
        //       // console.log(e.target);
        //       // console.log(formik.values.item);
        //       // show(e.value.code);
        //       // this.setState(({
        //       //   loading: true
        //       // }));
        //       // this.tryLaunch();
        //       tryEdit();
        //       // confirm1(e);
        //       break;
        //     default:
        //   }
        // }}
        style={{ width: '100%', textAlign: "left" }}
      />
    </form>
  );

}
export default NavigationBar;

