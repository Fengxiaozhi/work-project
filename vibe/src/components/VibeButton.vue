<template>
  <button
    class="vibe-button"
    :class="[
      `vibe-button--${type}`,
      { 'is-plain': plain }
    ]"
    @click="$emit('click', $event)"
  >
    <slot></slot>
  </button>
</template>

<script>
export default {
  name: 'VibeButton',
  props: {
    type: {
      type: String,
      default: 'primary'
    },
    plain: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      // 使用 Options API 确保向下兼容
    };
  }
};
</script>

<style lang="less" scoped>
@import '../styles/base.less';

.vibe-button {
  display: inline-block;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  background: #fff;
  border: 1px solid #dcdfe6;
  color: #606266;
  text-align: center;
  box-sizing: border-box;
  outline: none;
  margin: 0;
  transition: .1s;
  font-weight: 500;
  padding: 12px 20px;
  font-size: 14px;
  border-radius: 4px;

  &:hover {
    color: @primary-color;
    border-color: lighten(@primary-color, 20%);
    background-color: lighten(@primary-color, 45%);
  }

  &--primary {
    color: #fff;
    background-color: @primary-color;
    border-color: @primary-color;

    &:hover {
      background: lighten(@primary-color, 10%);
      border-color: lighten(@primary-color, 10%);
      color: #fff;
    }
  }

  &--success {
    color: #fff;
    background-color: @success-color;
    border-color: @success-color;
  }
}
</style>
