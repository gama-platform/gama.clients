import React from 'react'
import { useGoogleLogin } from '@react-oauth/google';
import { SERVER_LINK } from '../../dev-server-link';
import { Button } from 'reactstrap';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux'

import { glogin } from '../../store/Auth/auth-actions'

const GLogin = () => {

  const dispatch = useDispatch();
  const loginState = useSelector(state => state.auth);
  const googleLogin = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async (codeResponse) => {
      // console.log(codeResponse);
      //  await axios.post(
      //   SERVER_LINK+"/auth/google", {
      //         code: codeResponse.code,
      //     });

      dispatch(glogin(codeResponse.code))

      console.log(codeResponse.code);
    },
    onError: errorResponse => console.log(errorResponse),
  });
  return <Button onClick={() => (googleLogin())}>Sign in with Google</Button>;
}
export default GLogin;