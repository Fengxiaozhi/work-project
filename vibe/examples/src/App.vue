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
          @drag-copy="handleDragCopy"
          @drag-move="handleDragMove"
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
      mockData: (() => {
        const stages = [];
        for (let i = 1; i <= 20; i++) {
          const steps = [];
          for (let j = 1; j <= 150; j++) {
            steps.push({
              id: i * 1000 + j,
              no: `${i}-${j}`,
              name: `步骤 ${i}-${j}`,
              description: `大数据测试步骤`,
              config: '高性能配置',
              checked: false
            });
          }
          stages.push({
            id: i,
            no: String(i).padStart(2, '0'),
            name: `大数据测试阶段 ${i}`,
            description: `包含 150 个步骤`,
            config: '-',
            expanded: i === 1, // 初始只展开一个，减少初始渲染压力
            checked: false,
            children: steps
          });
        }
        return stages;
      })(),
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
    async handleDragSave(changes) {
      console.log('拖拽变更批次：', changes);
      
      // 取批次中的第一个项来展示提示信息
      const first = changes[0];
      const count = changes.length;
      const desc = first.type === 'stage' ? `阶段 [${first.item.name}] 等${count}项` : `步骤 [${first.item.name}] 等${count}项`;
      
      const loading = this.$loading({
        lock: true,
        text: `正在同步${desc}的位置...`,
        spinner: 'el-icon-loading',
        background: 'rgba(0, 0, 0, 0.7)'
      });

      try {
        // 模拟 API 请求（发送整个变更数组）
        await this.simulateApiSave(changes);
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
        children: []
      };
      this.mockData.push(newStage);
      this.$message.success('已派发增加阶段事件，父组件已添加新行');
    },
    // 处理添加步骤
    handleAddStep(stage) {
      const parentNo = stage.no;
      const stepIdx = (stage.children || []).length + 1;
      const newStep = {
        no: `${parentNo}-${stepIdx}`,
        id: Date.now(),
        name: '新步骤',
        description: '-',
        config: '-',
        checked: false
      };
      if (!stage.children) this.$set(stage, 'children', []);
      stage.children.push(newStep);
      stage.expanded = true;
      this.$message.success(`已派发增加步骤事件，已在阶段[${stage.name}]下添加新行`);
    },
    // 处理内置复制逻辑
    async handleDragCopy(payload) {
      try {
        // 模拟后端处理：生成带有新 ID 的副本数据
        const result = await this.simulateComplexAction(payload);
        
        // 模拟返回的新数据 (通常后端会返回 fresh IDs)
        // 这里简单处理：克隆原始数据并修改 ID
        const selectedIds = payload.selectionIds;
        let newData = [];
        if (payload.selectionType === 'stage') {
          newData = this.mockData
            .filter(s => selectedIds.includes(s.id))
            .map(s => ({ ...JSON.parse(JSON.stringify(s)), id: Date.now() + Math.random(), name: s.name + ' (副本)' }));
        } else {
          this.mockData.forEach(s => {
            if (s.children) {
              const matches = s.children.filter(st => selectedIds.includes(st.id));
              matches.forEach(m => {
                newData.push({ ...JSON.parse(JSON.stringify(m)), id: Date.now() + Math.random(), name: m.name + ' (副本)' });
              });
            }
          });
        }

        // 调用组件的 commitAction 完成手术级插入
        this.$refs.vibeList.commitAction({
          ...payload,
          newData: newData
        });
        
        this.$message.success('复制成功 (后端已同步)');
      } catch (error) {
        this.$message.error('同步失败: ' + error.message);
        // 失败时不调用 commitAction，弹窗会自动保持 loading 或由处理逻辑关闭
        this.$refs.vibeList.dialogLoading = false; 
      }
    },
    // 处理内置移动逻辑
    async handleDragMove(payload) {
      try {
        // 模拟后端变更
        await this.simulateComplexAction(payload);
        
        // 提交变更：移动逻辑不需要 newData，组件会自动执行本地 splice
        this.$refs.vibeList.commitAction(payload);
        
        this.$message.success('移动成功');
      } catch (error) {
        this.$message.error('同步失败: ' + error.message);
        this.$refs.vibeList.dialogLoading = false;
      }
    },
    simulateComplexAction(payload) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() > 0.9) { // 降低演示失败率
            reject(new Error('服务端处理超时'));
          } else {
            resolve();
          }
        }, 1200);
      });
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
