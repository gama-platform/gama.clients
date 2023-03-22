const fs = require("fs");
const path = require("path");
const { exec } = require('child_process');
const { v4: uuid } = require("uuid");
const {
    copyFilesToDocker, createContainer,
    killContainer, deleteFileDocker,
    compile, execute
} = require('./docker');
const { dateTimeNowFormated, logger, delay } = require('../utils');

// ####################################################################################
// ####################################################################################
const imageIndex = { GAML: 0 };// { GCC: 0, PY: 1, JS: 2, JAVA: 3 };
const imageNames = [
    // 'gcc:latest',
    // 'python:3.10-slim',
    // 'node:16.17.0-bullseye-slim',
    // 'openjdk:17-jdk-alpine',
    'gamaplatform/mini:alpha',
];
const containerNames = [
    // 'gcc-oj-container',
    // 'py-oj-container',
    // 'js-oj-container',
    // 'java-oj-container',
    'gama-container'
];
/** @type {string[]} */
const containerIds = [];

const execInContainer = (name, containerId) => {
    // const command = "bash gama-headless.sh -validate";
    // await new Promise((resolve, reject) => {
    //     exec(`docker exec ${data} ${command}`, (error, stdout, stderr) => {
    //         error && reject({ msg: 'on error', error, stderr });
    //         stderr && reject({ msg: 'on stderr', stderr });
    //     });
    // });
    return new Promise( (resolve, reject) => {
        try {
            exec(`docker exec -d ${containerId} bash gama-headless -validate`, async (error, stdout, stderr) => {
                (error || stderr) && reject({ msg: 'on docker error', error, stderr });
                // const containerId = `${stdout}`.trim();
                console.log("validated "+stdout);
                await delay(20000);
                resolve(containerId);
            });
        } catch (error) {
            console.log(error);
            reject(`${name} Docker Error : ${JSON.stringify(error)}`);
        }
    });
}

const initDockerContainer = (uid, prt, image, index) => {
    const name = containerNames[index] + "_" + uid;
    return new Promise(async (resolve, reject) => {
        try {
            // check and kill already running container
            await killContainer(name);
            // now create new container of image
            // const cmd="-validate";
            // const data = await createContainer({ name, image, prt, cmd });      
            const cmd1 = "-socket 6868";
            const data = await createContainer({ name, image, prt, cmd1 });

            containerIds[index] = data;
            // const data1 = await execInContainer(name, data);


            const data1 = await execInContainer(name, data);

            console.log(`${name} Id : d1 ${data1}`);
            resolve(`${name} Id : ${data} d1 ${data1}`);

        } catch (error) {
            reject(`${name} Docker Error : ${JSON.stringify(error)}`);
        }
    });
}
const initAllDockerContainers = async (uid, prt) => {
    try {
        const res = await Promise.all(imageNames.map((image, index) => initDockerContainer(uid, prt, image, index)));
        logger.log(res.join('\n'));
        logger.log("\nAll Containers Initialized");
    } catch (error) {
        logger.error("Docker Error: ", error);
        logger.error(dateTimeNowFormated());
    }
}

const languageSpecificDetails = {
    // 'c': {
    //     compiledExtension: 'out',
    //     inputFunction: null,
    //     containerId: () => containerIds[imageIndex.GCC]
    // },
    // 'cpp': {
    //     compiledExtension: 'out',
    //     inputFunction: null,
    //     containerId: () => containerIds[imageIndex.GCC]
    // },
    // 'py': {
    //     compiledExtension: '',
    //     inputFunction: data => (data ? data.split(' ').join('\n') : ''),
    //     containerId: () => containerIds[imageIndex.PY]
    // },
    // 'js': {
    //     compiledExtension: '',
    //     inputFunction: null,
    //     containerId: () => containerIds[imageIndex.JS]
    // },
    'java': {
        compiledExtension: 'class',
        inputFunction: null,
        containerId: () => containerIds[imageIndex.JAVA]
    }
};
// ####################################################################################
// ####################################################################################


const codeDirectory = path.join(__dirname, "codeFiles");

// for the first time create 'codeFiles' directory
if (!fs.existsSync(codeDirectory)) {
    fs.mkdirSync(codeDirectory, { recursive: true });
}

const createFile = (fileExtension, content) => {
    const id = uuid();
    const filename = `${id}.${fileExtension}`;
    const filepath = path.join(codeDirectory, filename);
    fs.writeFileSync(filepath, content);
    return { filepath, filename };
}

const readFile = filepath => {
    if (!filepath.includes("\\") && !filepath.includes("/"))
        filepath = path.join(codeDirectory, filepath);

    if (!fs.existsSync(filepath))
        return undefined;
    return fs.readFileSync(filepath);
}

const deleteFile = filepath => {
    if (!filepath.includes("\\") && !filepath.includes("/"))
        filepath = path.join(codeDirectory, filepath);

    if (!fs.existsSync(filepath)) return;
    fs.unlinkSync(filepath);
    logger.log('Unlinked :', path.basename(filepath));
}

const stderrMsgFn = ({ index, input, output, exOut }) => `Testcase ${index} Failed 
Testcase: 
${input} 
Expected Output: 
${output} 
Your Output: 
${exOut}`;

const languageErrMsg = `Please select a language / valid language.
Or may be this language is not yet supported !`

const execCodeAgainstTestcases = (filePath, testcase, language) => {

    // check if language is supported or not
    if (!languageSpecificDetails[language]) return { msg: languageErrMsg };

    let containerId = languageSpecificDetails[language].containerId();
    if (!containerId) return reject({ msg: languageErrMsg });

    if (!filePath.includes("\\") && !filePath.includes("/"))
        filePath = path.join(codeDirectory, filePath);

    const { input, output } = require(`./testcases/${testcase}`)

    return new Promise(async (resolve, reject) => {
        let filename = null;
        try {
            filename = await copyFilesToDocker(filePath, containerId);
            const compiledId = await compile(containerId, filename, language);

            for (let index = 0; index < input.length; ++index) {
                const exOut = await execute(containerId, compiledId,
                    languageSpecificDetails[language].inputFunction ? languageSpecificDetails[language].inputFunction(input[index]) : input[index],
                    language
                );
                // if socket connection established then send to client the index of passed test case
                if (exOut !== output[index]) {
                    reject({
                        msg: 'on wrong answer',
                        stderr: stderrMsgFn({ index, input: input[index], output: output[index], exOut })
                    });
                    break;
                }
            }

            resolve({ msg: 'All Test Cases Passed' });
        } catch (error) {
            reject(error);
        } finally {
            try {
                if (filename)
                    await deleteFileDocker(filename, containerId);

                if (filename && languageSpecificDetails[language].compiledExtension) {
                    // TODO: Update 'Solution.class' to id.class
                    await deleteFileDocker(
                        ((language === 'java') ? 'Solution.class' : ((filename.split('.')[0]) + '.' + languageSpecificDetails[language].compiledExtension)),
                        containerId
                    );
                }
            } catch (error) {
                logger.error('Caught some errors while deleting files from Docker Container', error, containerId, dateTimeNowFormated());
            }
        }
    });
}

const execCode = async (filePath, language, inputString) => {

    if (!inputString) inputString = '';

    // check if language is supported or not
    if (!languageSpecificDetails[language]) return { msg: languageErrMsg };

    let containerId = languageSpecificDetails[language].containerId();
    if (!containerId) return { msg: languageErrMsg };

    if (!filePath.includes("\\") && !filePath.includes("/"))
        filePath = path.join(codeDirectory, filePath);

    let filename = null;
    try {
        filename = await copyFilesToDocker(filePath, containerId);
        const compiledId = await compile(containerId, filename, language);
        const exOut = await execute(containerId, compiledId,
            languageSpecificDetails[language].inputFunction ? languageSpecificDetails[language].inputFunction(inputString) : inputString,
            language
        );
        return ({ msg: "Compiled Successfully", stdout: exOut });
    } catch (error) {
        return error;
    } finally {
        try {
            if (filename)
                await deleteFileDocker(filename, containerId);

            if (filename && languageSpecificDetails[language].compiledExtension) {
                // TODO: Update 'Solution.class' to id.class
                await deleteFileDocker(
                    ((language === 'java') ? 'Solution.class' : ((filename.split('.')[0]) + '.' + languageSpecificDetails[language].compiledExtension)),
                    containerId
                );
            }
        } catch (error) {
            logger.error('Caught some errors while deleting files from Docker Container', error, containerId, dateTimeNowFormated());
        }
    }
}

module.exports = {
    readFile, createFile,
    deleteFile, execCode,
    execCodeAgainstTestcases,
    initAllDockerContainers, execInContainer,
    initDockerContainer
};
