<template>
  <div id="app">
    <div class="demo-container">
      <h1>Vibe UI 组件库演示</h1>
      
      <section>
        <h2>Button 按钮</h2>
        <vibe-button @click="handleClick">主要按钮</vibe-button>
        <vibe-button type="success" @click="handleClick">成功按钮</vibe-button>
      </section>

      <section style="margin-top: 20px;">
        <h2>Stage List 阶段步骤列表 (配置项自定义演示)</h2>
        <vibe-stage-list 
          :list="mockData" 
          :columns="customColumns"
          :toolbar-actions="customToolbar"
          :row-actions="customRowActions"
          @toolbar-action="handleToolbarAction"
          @row-action="handleRowAction"
          @selection-change="handleSelectionChange"
        ></vibe-stage-list>
      </section>

      <section style="margin-top: 20px;">
        <h2>结合 Element UI</h2>
        <el-button type="primary">Element 按钮</el-button>
        <el-tag>标签</el-tag>
      </section>
    </div>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      mockData: [
        {
          id: 1,
          name: '应急处置',
          description: '-',
          config: '-',
          expanded: true,
          checked: false,
          steps: [
            { id: 101, name: '核实信息', description: '核实报警人身份', config: '电话确认', checked: false },
            { id: 102, name: '现场封锁', description: '疏散人群', config: '警力调配', checked: false }
          ]
        },
        {
          id: 2,
          name: '善后处理',
          description: '处理事故现场',
          config: '-',
          remark: '需要多方协作',
          expanded: false,
          checked: false,
          steps: []
        }
      ],
      customColumns: [
        { label: '说明', prop: 'description', flex: 2 },
        { label: '应急操作配置', prop: 'config', flex: 2 }
      ],
      customToolbar: [
        { label: '复制', command: 'copy', disabled: (selection) => !selection.length },
        { label: '移动', command: 'move', disabled: (selection) => !selection.length },
        { label: '删除', command: 'delete', disabled: (selection) => !selection.length }
      ],
      customRowActions: [
        { label: '编辑', command: 'edit' },
        { label: '删除', command: 'delete', class: 'text-danger' },
        { label: '', command: 'more', icon: 'el-icon-more' }
      ]
    };
  },
  methods: {
    handleClick() {
      this.$message.success('Vibe Button Clicked!');
    },
    handleSelectionChange(val) {
      console.log('Selected:', val);
    },
    handleToolbarAction(command, selection) {
      this.$message.info(`Toolbar Action: ${command}, count: ${selection.length}`);
    },
    handleRowAction(command, row) {
      this.$message.info(`Row Action: ${command} on ${row.name}`);
    }
  }
};
</script>

<style lang="less">
.demo-container {
  padding: 40px;
  font-family: Arial, sans-serif;
  
  section {
    padding: 20px;
    border: 1px solid #eee;
    border-radius: 8px;
    margin-bottom: 20px;
  }
  
  h1 {
    color: #333;
  }
  
  h2 {
    font-size: 18px;
    margin-bottom: 15px;
    color: #666;
  }
}
</style>
