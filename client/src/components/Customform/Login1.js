import React from 'react'
import { useGoogleLogin } from '@react-oauth/google';
import { SERVER_LINK } from '../../dev-server-link';
import { Button } from 'reactstrap';
const Login1 = () => {
    const login = useGoogleLogin({
        onSuccess: (codeResponse) => {
            const response = fetch(
                `${SERVER_LINK}/auth/google/`,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    method: 'POST',
                    credentials: 'include',
                }
            ).then(data => data.json());

            console.log(response);
        },
        flow: "auth-code",
        redirect_uri: "http://localhost:3000/",
    })

    return <Button onClick={() => login()}>Sign in with Google 🚀 </Button>;

}
export default Login1;