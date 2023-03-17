import React from 'react'
import { useGoogleLogin } from '@react-oauth/google';
import { SERVER_LINK } from '../../dev-server-link';
import { Button } from 'reactstrap';
import axios from 'axios';

const GLogin = () => {

  const googleLogin = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async (codeResponse) => {
        // console.log(codeResponse);
        const tokens = await axios.post(
          SERVER_LINK+"/auth/google", {
                code: codeResponse.code,
            });

        // console.log(tokens);
    },
    onError: errorResponse => console.log(errorResponse),
});

  return <Button onClick={() => (googleLogin())}>Sign in with Google 🚀 </Button>;
}
export default GLogin;