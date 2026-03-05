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
          ref="vibeList"
          :list="mockData" 
          :columns="customColumns"
          :toolbar-actions="customToolbar"
          :row-actions="customRowActions"
          @toolbar-action="handleToolbarAction"
          @row-action="handleRowAction"
          @selection-change="handleSelectionChange"
          @drag-save="handleDragSave"
          @add-stage="handleAddStage"
          @add-step="handleAddStep"
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
          no: '01',
          name: '应急处置',
          description: '-',
          config: '-',
          expanded: true,
          checked: false,
          steps: [
            { id: 101, no: '1-1', name: '核实信息', description: '核实报警人身份', config: '电话确认', checked: false },
            { id: 102, no: '1-2', name: '现场封锁', description: '疏散人群', config: '警力调配', checked: false }
          ]
        },
        {
          id: 2,
          no: '02',
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
        { label: '序号', type: 'index', prop: 'no', width: '90px' },
        { label: '阶段/步骤名', prop: 'name', flex: 2 },
        { label: '说明', prop: 'description', flex: 1 },
        { label: '配置', prop: 'config', flex: 1 },
        { label: '备注', prop: 'remark', flex: 1 }
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
    },
    // 将变更保存到后端
    async handleDragSave(change) {
      const { type, item, action } = change;
      const desc = type === 'stage' ? `阶段 [${item.name}]` : `步骤 [${item.name}]`;
      
      const loading = this.$loading({
        lock: true,
        text: `正在同步${desc}的位置...`,
        spinner: 'el-icon-loading',
        background: 'rgba(0, 0, 0, 0.7)'
      });

      try {
        // 模拟 API 请求
        await this.simulateApiSave(change);
        this.$message.success(`${desc}位置已实时同步到后端`);
      } catch (error) {
        this.$message.error(`${desc}同步失败，正在回滚位置...`);
        // 调用组件暴露的 rollback 方法
        this.$refs.vibeList.rollback();
      } finally {
        loading.close();
      }
    },
    // 模拟接口请求
    simulateApiSave(change) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          // 模拟 30% 失败率
          if (Math.random() > 0.7) {
            reject(new Error('Network Error'));
          } else {
            resolve();
          }
        }, 1000);
      });
    },
    // 处理添加阶段
    handleAddStage() {
      const newStage = {
        no: String(this.mockData.length + 1).padStart(2, '0'),
        id: Date.now(),
        name: '新阶段',
        description: '-',
        config: '-',
        expanded: true,
        checked: false,
        steps: []
      };
      this.mockData.push(newStage);
      this.$message.success('已派发增加阶段事件，父组件已添加新行');
    },
    // 处理添加步骤
    handleAddStep(stage) {
      const parentNo = stage.no;
      const stepIdx = (stage.steps || []).length + 1;
      const newStep = {
        no: `${parentNo}-${stepIdx}`,
        id: Date.now(),
        name: '新步骤',
        description: '-',
        config: '-',
        checked: false
      };
      if (!stage.steps) this.$set(stage, 'steps', []);
      stage.steps.push(newStep);
      stage.expanded = true;
      this.$message.success(`已派发增加步骤事件，已在阶段[${stage.name}]下添加新行`);
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
