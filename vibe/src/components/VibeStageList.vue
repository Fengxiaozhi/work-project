<template>
  <div class="vibe-stage-list">
    <!-- 顶部操作栏 -->
    <div class="vibe-stage-toolbar">
      <div class="left-actions">
        <el-button 
          v-for="action in toolbarActions"
          :key="action.label"
          :size="action.size || 'small'"
          :type="action.type"
          :icon="action.icon"
          :disabled="typeof action.disabled === 'function' ? action.disabled(selection) : action.disabled"
          @click="$emit('toolbar-action', action.command, selection)"
        >
          {{ action.label }}
        </el-button>
      </div>
      <div class="right-actions">
        <el-input
          v-model="searchQuery"
          placeholder="请输入阶段/步骤名"
          size="small"
          suffix-icon="el-icon-search"
          style="width: 200px; margin-right: 15px;"
        ></el-input>
        <el-button type="text" size="small" @click="toggleAll(false)">
          <i class="el-icon-s-fold"></i> 全部折叠
        </el-button>
        <el-divider direction="vertical"></el-divider>
        <el-button type="text" size="small" @click="toggleAll(true)">
          <i class="el-icon-s-unfold"></i> 全部展开
        </el-button>
      </div>
    </div>

    <!-- 表头 -->
    <div class="vibe-stage-header">
      <div class="col-check">
        <el-checkbox :indeterminate="isIndeterminate" v-model="checkAll" @change="handleCheckAll"></el-checkbox>
      </div>
      <div class="col-index">序号</div>
      <div class="col-name">阶段/步骤名</div>
      <div v-for="col in columns" :key="col.prop" :class="`col-dynamic`" :style="{ flex: col.flex || 1 }">
        {{ col.label }}
      </div>
      <div class="col-ops">操作</div>
    </div>

    <!-- 列表内容 - 支持阶段拖拽 -->
    <draggable
      v-model="internalList"
      handle=".drag-handle-stage"
      animation="200"
      ghost-class="vibe-ghost"
    >
      <div v-for="(stage, sIdx) in internalList" :key="stage.id" class="vibe-stage-group">
        <!-- 阶段行 -->
        <div class="vibe-row vibe-stage-row">
          <div class="col-check">
            <el-checkbox v-model="stage.checked" @change="handleItemCheck"></el-checkbox>
          </div>
          <div class="col-index">
            <i class="el-icon-rank drag-handle-stage"></i>
            <i 
              :class="stage.expanded ? 'el-icon-caret-bottom' : 'el-icon-caret-right'"
              class="expand-icon"
              @click="stage.expanded = !stage.expanded"
            ></i>
            {{ sIdx + 1 }}
          </div>
          <div class="col-name">{{ stage.name }}</div>
          <!-- 动态列 -->
          <div v-for="col in columns" :key="col.prop" class="col-dynamic" :style="{ flex: col.flex || 1 }">
            {{ stage[col.prop] || '-' }}
          </div>
          <div class="col-ops">
            <el-button 
              v-for="action in rowActions"
              :key="action.label"
              type="text" 
              size="small" 
              :class="action.class"
              @click="$emit('row-action', action.command, stage)"
            >
              <i v-if="action.icon" :class="action.icon"></i>
              {{ action.label }}
            </el-button>
          </div>
        </div>

        <!-- 步骤子列表 - 只有展开时显示 -->
        <div v-show="stage.expanded" class="vibe-step-container">
          <draggable
            v-model="stage.steps"
            :group="{ name: 'steps' }"
            handle=".drag-handle-step"
            animation="200"
            ghost-class="vibe-ghost"
          >
            <div v-for="(step, stIdx) in stage.steps" :key="step.id" class="vibe-row vibe-step-row">
              <div class="col-check">
                <el-checkbox v-model="step.checked" @change="handleItemCheck"></el-checkbox>
              </div>
              <div class="col-index">
                <i class="el-icon-rank drag-handle-step"></i>
                <span style="margin-left: 20px">{{ sIdx + 1 }}-{{ stIdx + 1 }}</span>
              </div>
              <div class="col-name">{{ step.name }}</div>
              <!-- 动态列 -->
              <div v-for="col in columns" :key="col.prop" class="col-dynamic" :style="{ flex: col.flex || 1 }">
                {{ step[col.prop] || '-' }}
              </div>
              <div class="col-ops">
                <el-button 
                  v-for="action in rowActions"
                  :key="action.label"
                  type="text" 
                  size="small" 
                  :class="action.class"
                  @click="$emit('row-action', action.command, step)"
                >
                  <i v-if="action.icon" :class="action.icon"></i>
                  {{ action.label }}
                </el-button>
              </div>
            </div>
          </draggable>
          <!-- 添加步骤 -->
          <div class="vibe-add-step">
            <el-button type="text" icon="el-icon-plus" @click="addStep(stage)">添加步骤</el-button>
          </div>
        </div>
      </div>
    </draggable>

    <!-- 添加阶段 -->
    <div class="vibe-add-stage">
      <el-button type="text" icon="el-icon-plus" @click="addStage">添加阶段</el-button>
      <el-tooltip content="添加一个新阶段分支" placement="right">
        <i class="el-icon-info" style="color: #909399; margin-left: 5px; cursor: pointer;"></i>
      </el-tooltip>
    </div>
  </div>
</template>

<script>
import draggable from 'vuedraggable';

export default {
  name: 'VibeStageList',
  components: { draggable },
  props: {
    list: {
      type: Array,
      default: () => []
    },
    // 新增：列配置
    columns: {
      type: Array,
      default: () => [
        { label: '说明', prop: 'description', flex: 2 },
        { label: '应急操作配置', prop: 'config', flex: 2 }
      ]
    },
    // 新增：顶部工具栏配置
    toolbarActions: {
      type: Array,
      default: () => [
        { label: '复制', command: 'copy', disabled: (selection) => !selection.length },
        { label: '移动', command: 'move', disabled: (selection) => !selection.length },
        { label: '删除', command: 'delete', disabled: (selection) => !selection.length }
      ]
    },
    // 新增：行操作配置
    rowActions: {
      type: Array,
      default: () => [
        { label: '编辑', command: 'edit' },
        { label: '删除', command: 'delete', class: 'text-danger' },
        { label: '', command: 'more', icon: 'el-icon-more' }
      ]
    }
  },
  data() {
    return {
      internalList: [],
      searchQuery: '',
      checkAll: false,
      isIndeterminate: false,
      selection: []
    };
  },
  watch: {
    list: {
      immediate: true,
      handler(val) {
        this.internalList = JSON.parse(JSON.stringify(val));
      }
    }
  },
  methods: {
    toggleAll(expanded) {
      this.internalList.forEach(item => {
        item.expanded = expanded;
      });
    },
    handleCheckAll(val) {
      this.internalList.forEach(stage => {
        stage.checked = val;
        if (stage.steps) {
          stage.steps.forEach(step => {
            step.checked = val;
          });
        }
      });
      this.isIndeterminate = false;
      this.updateSelection();
    },
    handleItemCheck() {
      let checkedCount = 0;
      let totalCount = 0;
      this.internalList.forEach(stage => {
        totalCount++;
        if (stage.checked) checkedCount++;
        if (stage.steps) {
          stage.steps.forEach(step => {
            totalCount++;
            if (step.checked) checkedCount++;
          });
        }
      });
      this.checkAll = checkedCount === totalCount && totalCount > 0;
      this.isIndeterminate = checkedCount > 0 && checkedCount < totalCount;
      this.updateSelection();
    },
    updateSelection() {
      const selected = [];
      this.internalList.forEach(stage => {
        if (stage.checked) selected.push(stage);
        if (stage.steps) {
          stage.steps.forEach(step => {
            if (step.checked) selected.push(step);
          });
        }
      });
      this.selection = selected;
      this.$emit('selection-change', selected);
    },
    addStage() {
      const newStage = {
        id: Date.now(),
        name: '新建阶段',
        description: '',
        config: '',
        expanded: true,
        checked: false,
        steps: []
      };
      this.internalList.push(newStage);
    },
    addStep(stage) {
      const newStep = {
        id: Date.now(),
        name: '新建步骤',
        description: '',
        config: '',
        checked: false
      };
      if (!stage.steps) this.$set(stage, 'steps', []);
      stage.steps.push(newStep);
      stage.expanded = true;
    }
  }
};
</script>

<style lang="less" scoped>
@import '../styles/base.less';

.vibe-stage-list {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  font-size: 14px;
  color: #606266;

  .vibe-stage-toolbar {
    padding: 15px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #f0f0f0;
  }

  .vibe-stage-header {
    background-color: #f9fafc;
    display: flex;
    padding: 12px 20px;
    font-weight: bold;
    border-bottom: 1px solid #ebeef5;
    
    div { padding: 0 5px; }
  }

  .vibe-stage-group {
    border-bottom: 1px solid #ebeef5;
  }

  .vibe-row {
    display: flex;
    padding: 12px 20px;
    align-items: center;
    transition: background-color 0.2s;
    
    &:hover {
      background-color: #f5f7fa;
    }
    
    div { padding: 0 5px; }
  }

  .vibe-stage-row {
    background-color: #fff;
    font-weight: 500;
  }

  .vibe-step-row {
    background-color: #fff;
    padding-left: 45px; // 缩进
    border-top: 1px dashed #f0f0f0;
  }

  .vibe-step-container {
    background-color: #fff;
  }

  // 列宽度分配
  .col-check { width: 40px; }
  .col-index { width: 80px; display: flex; align-items: center; }
  .col-name { flex: 2; }
  .col-desc { flex: 2; color: #909399; }
  .col-config { flex: 2; color: #909399; }
  .col-ops { width: 150px; text-align: right; }

  .drag-handle-stage, .drag-handle-step {
    cursor: move;
    color: #c0c4cc;
    margin-right: 8px;
    font-size: 16px;
  }

  .expand-icon {
    cursor: pointer;
    margin-right: 5px;
    color: #c0c4cc;
    transition: transform 0.2s;
    &:hover { color: @primary-color; }
  }

  .vibe-add-step {
    padding: 10px 0 10px 105px;
  }

  .vibe-add-stage {
    padding: 15px 45px;
    border-top: 1px solid #ebeef5;
  }

  .vibe-ghost {
    opacity: 0.5;
    background: #c8ebfb !important;
  }

  .text-danger {
    color: #F56C6C;
    &:hover { color: lighten(#F56C6C, 10%); }
  }
}
</style>
