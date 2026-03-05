import VibeButton from './components/VibeButton.vue';
import VibeStageList from './components/VibeStageList.vue';

const components = [
    VibeButton,
    VibeStageList
];

const install = function (Vue) {
    if (install.installed) return;
    components.forEach(component => {
        Vue.component(component.name, component);
    });
};

if (typeof window !== 'undefined' && window.Vue) {
    install(window.Vue);
}

export {
    VibeButton,
    VibeStageList
};

export default {
    install,
    ...components
};
