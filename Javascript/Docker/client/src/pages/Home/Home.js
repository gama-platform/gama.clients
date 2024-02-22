import React, { Fragment }  from 'react' 
import TabLayout from '../../components/TabLayout';

const Home = (props) => {
    return (
        <Fragment>
            <TabLayout gama={props.gama}/> 
        </Fragment>
        // <div>Home
        //     <div>This site is still in development</div>
        //     <div>This page has not yet been developed</div>
        // </div>
    )
}

export default Home;