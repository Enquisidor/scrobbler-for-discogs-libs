import { md5 } from '../../adapters/crypto';
export const createLastfmSignature = async (params, secret) => {
    const sortedKeys = Object.keys(params).sort();
    let sigString = '';
    sortedKeys.forEach(key => {
        if (key !== 'format' && key !== 'callback') {
            sigString += key + params[key];
        }
    });
    sigString += secret;
    return await md5(sigString);
};
