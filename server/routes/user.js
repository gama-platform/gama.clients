const express = require('express');
const router = express.Router();
const {
    gloginValidator,
    loginValidator,
    registerValidator,
    authProvider
} = require('../middlewares');
const {
    loginController,gloginController,initDockerController,
    registerController,
    logoutController,
    loggedInController,
    changePasswordController
} = require('../controllers/user');
const { loggingMiddleware } = require('../middlewares');

router.post('/login', loggingMiddleware, loginValidator, loginController);
router.post('/glogin', loggingMiddleware, gloginValidator, gloginController);
router.post('/register', loggingMiddleware, registerValidator, registerController);
router.get('/logout', loggingMiddleware, logoutController);
router.get('/initDocker', loggingMiddleware, initDockerController);
router.get('/loggedIn', loggingMiddleware, loggedInController);
router.put('/changePassword', loggingMiddleware, changePasswordController);

module.exports = router;