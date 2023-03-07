import React, { useRef, useState } from 'react'
import 'primereact/resources/themes/lara-light-indigo/theme.css';   // theme
import 'primereact/resources/primereact.css';                       // core css
import 'primeicons/primeicons.css';                                 // icons 

import { useFormik } from 'formik';
import { ListBox } from 'primereact/listbox';
import { ConfirmPopup } from 'primereact/confirmpopup'; // To use <ConfirmPopup> tag
import { confirmPopup } from 'primereact/confirmpopup'; // To use confirmPopup method


import { Toast } from 'primereact/toast';
import { models } from './data.js';

class NavigationBar extends React.Component {
  constructor(param) {
    super(param);
    this.mySelRef = React.createRef();
    this.id = "m" + param.id;
  }


  render() {

    const toast = this.props.toast;
    const formik = this.props.formik;
    const confirm1 = this.props.confirm1;


    return (
      <form onSubmit={formik.handleSubmit} className="flex flex-column align-items-left">
        {/* <Button type="submit" label="Launch"  /> */}
        <Toast ref={toast} />
        <ConfirmPopup />
        <ListBox
          id="item"
          name="item"
          filter
          value={formik.values.item}
          options={models}
          optionLabel="name"
          placeholder="Select a Experiment"
          onChange={(e) => {
            formik.setFieldValue('item', e.value);
            // console.log(e);
            // show(e.value.code);
            // confirm1(e);
          }}
          onClick={(e) => {
            switch (e.detail) {
              case 1:
                // console.log("click");
                break;
              case 2:

                // console.log(mygrid); 
                // formik.setFieldValue('item', e.value);
                // console.log(e.target);
                // console.log(formik.values.item);
                // show(e.value.code);
                confirm1(e);
                break;
              case 3:
                // console.log("triple click");
                break;
            }
          }}
          style={{ width: '100%', textAlign: "left" }}
        />
      </form>
    );
  }


}
// export default NavigationBar;


export default () => {

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
  return (
    <NavigationBar toast={toast} confirm1={confirm1} formik={formik} />
  )
}