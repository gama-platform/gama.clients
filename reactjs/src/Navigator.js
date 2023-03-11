import React, { useRef, useState } from 'react'
import 'primereact/resources/themes/lara-light-indigo/theme.css';   // theme
import 'primereact/resources/primereact.css';                       // core css
import 'primeicons/primeicons.css';                                 // icons 

import { useFormik } from 'formik';
import { ListBox } from 'primereact/listbox';
import { ConfirmPopup } from 'primereact/confirmpopup'; // To use <ConfirmPopup> tag
import { confirmPopup } from 'primereact/confirmpopup'; // To use confirmPopup method


import { Toast } from 'primereact/toast';
import { models } from './assets/data.js';

class NavigationBar extends React.Component {
  constructor(param) {
    super(param);
    // this.mySelRef = React.createRef();
    this.item = "";
    this.state = {
      loading: false,
    };
    this.id = "m" + param.id;
    this.loading = false;
    this.tryEdit = this.tryEdit.bind(this);

  }


  render() {

    const toast = this.props.toast;
    // const formik = this.props.formik;
    const confirm1 = this.props.confirm1;


    return (
      <form onSubmit={this.props.formik.handleSubmit} className="flex flex-column align-items-left">
        {/* <Button type="submit" label="Launch"  /> */}
        <Toast ref={toast} />
        <ConfirmPopup />
        <ListBox
          id="item"
          name="item"
          filter
          value={this.props.formik.values.item}
          options={models}
          disabled={this.state.loading}
          optionLabel="name"
          placeholder="Select a Experiment"
          onChange={(e) => {
            this.item = e.value.code;
            // console.log(e.value);
            // console.log(this.item);
            // show(e.value.code);
            // confirm1(e);
          }}
          onClick={(e) => {
            switch (e.detail) {
              case 2:

                // console.log(this.props.gama); 
                // formik.setFieldValue('item', e.value);
                // console.log(e.target);
                // console.log(formik.values.item);
                // show(e.value.code);
                // this.setState(({
                //   loading: true
                // }));
                // this.tryLaunch();
                this.tryEdit();
                // confirm1(e);
                break;
            }
          }}
          style={{ width: '100%', textAlign: "left" }}
        />
      </form>
    );
  }

  tryEdit() { 
    if (window.$gama.editor) {

      var mm = window.$gama.rootPath + "/" + this.item;
      window.$gama.modelPath = mm.split("|")[0];
      // console.log("edit " + this.props.gama.modelPath);
      // console.log(this.props.gama.editor.props.formik);
      this.props.gama.current.fetch(window.$gama.modelPath, (e) => {
        var ee = JSON.parse(e).content;
        // console.log(ee);
        window.$gama.editor.item=mm;
        window.$gama.editor.props.formik.resetForm();
        window.$gama.editor.props.formik.setFieldValue('path', mm);
        window.$gama.editor.props.formik.setFieldValue('description', ee);
      });

    }
  }

}
// export default NavigationBar;


export default (props) => {

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

  const accept = () => {
    toast.current.show({ severity: 'info', summary: 'Confirmed', detail: 'Experiment ' + formik.values.item.code, life: 3000 });
  };

  const reject = () => {
    // toast.current.show({ severity: 'warn', summary: 'Rejected', detail: 'You have rejected', life: 3000 });
  };

  const confirm1 = (event) => {
    confirmPopup({
      target: event.currentTarget,
      message: 'Are you sure you want to launch?',
      icon: 'pi pi-exclamation-triangle',
      accept,
      reject
    });
  };
  // console.log(props.gama.current);
  return (
    <NavigationBar toast={toast} confirm1={confirm1} formik={formik} gama={props.gama} />
  )
}