import Vue from 'vue';
import App from './App.vue';
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import VibeUI from '../../src/index';

Vue.use(ElementUI);
Vue.use(VibeUI);

new Vue({
    render: h => h(App),
}).$mount('#app');
