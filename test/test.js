import RestAPI from './RestAPI.js';

const api = new RestAPI('localhost',3000);
async function doIt() {
    let customers = await api.get('/api/customers?last_name=Meyer');
    console.log(customers);
    let customer = await api.get(`/api/customers/a9c1f5d6-87ed-425c-940d-6bc7a0d0f4f6`);
    console.log(customer);
}
doIt();