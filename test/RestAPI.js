import assert from 'node:assert';

class RestAPI {
    
    #url;
    #timeout = 5000;

    constructor(host, port) {
        assert(host);
        assert(port);
        this.#url = `http://${host}:${port}`;
    }
    /**
     * GET data from the deployment
     * @param {} path 
     * @returns 
     */
    async get(path) {
        let retVal = [];
        let options = {
            method: 'GET'
        };
        retVal = await this.#fetch(path, options);
        return retVal;
    }
    /**
     * POST json to the deployment
     * @param {*} path 
     * @param {*} payload 
     * @returns 
     */
    async post(path, payload) {
        let options = {
            method: 'POST'
        };
        if (payload instanceof URLSearchParams) {
            options.body = payload;
            options.headers = {
                'Content-Type': 'application/x-www-form-urlencoded'
            };
        } else {
            options.body = JSON.stringify(payload);
            options.headers = {
                'Content-Type': 'application/json'
            };
        }
        let retVal = await this.#fetch(path, options);
        return retVal;
    }
    /**
     * PUT json to the deployment
     * @param {*} path 
     * @param {*} payload 
     * @returns 
     */
    async put(path, payload) {
        let options = {
            method: 'PUT',
            body: JSON.stringify(payload)
        };
        let retVal = await this.#fetch(path, options);
        return retVal;
    }
    /**
     * DELETE from the deployment
     * @param {*} path 
     * @param {*} jsonPayload 
     * @returns 
     */
    async delete(path) {
        let options = {
            method: 'DELETE'
        };
        let retVal = await this.#fetch(path, options);
        return retVal;
    }
    /**
     * Wrap fetch so all we add is options and the variable path to the deployment URL.
     * @param {*} path 
     * @param {*} options 
     * @returns 
     */
    async #fetch(path, options) {
        let retVal;
        const controller = new AbortController();
        const timeout = this.#timeout;
        const id = setTimeout(() => controller.abort(), timeout);
        if (!options?.headers) {
            options.headers = {};
        }
        if (!options?.headers?.['Content-Type']) {
            options.headers['Content-Type'] = 'application/json';
        }
        options.headers.Accept = 'application/json';
        options.signal = controller.signal;
        try {
            let response = await fetch(`${this.#url}${path}`, options);
            let validCodes = [200, 201, 202, 203, 204];
            if (validCodes.includes(response.status)) {
                try {
                    retVal = await response.json();
                } catch (error) {
                    // console.error(error);
                    //ignore, we have a valid response code with no response body
                }
            } else {
                let text = await response.text();
                throw new Error(`${response.status} : ${text}`);
            }
        } catch (error) {
            console.error(error);
        } finally {
            clearTimeout(id);
        }
        return retVal;
    }
}
export default RestAPI;