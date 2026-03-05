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
          @click="handleAction(action.command, selection)"
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
        <el-checkbox 
          :indeterminate="isIndeterminate" 
          v-model="checkAll" 
          @change="handleCheckAll"
          :disabled="selectionStarted && selectionType === 'step'"
        ></el-checkbox>
      </div>
      <div 
        v-for="col in columns" 
        :key="col.label"
        :class="['col-item', col.type ? `col-${col.type}` : 'col-dynamic']"
        :style="col.width ? { width: col.width } : { flex: col.flex || 1 }"
      >
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
      @change="onStageChange"
    >
      <div 
        v-for="stage in internalList" 
        :key="stage.id" 
        class="vibe-stage-group"
        v-show="isStageVisible(stage)"
      >
        <!-- 阶段行 -->
        <div class="vibe-row vibe-stage-row">
          <div class="col-check">
            <el-checkbox 
              v-model="stage.checked" 
              @change="handleItemCheck('stage', stage)"
              :disabled="selectionStarted && selectionType === 'step'"
            ></el-checkbox>
            <i class="el-icon-rank drag-handle-stage"></i>
            <!-- 展开箭头挪到这里 -->
            <i 
              :class="stage.expanded ? 'el-icon-caret-bottom' : 'el-icon-caret-right'"
              class="expand-icon"
              @click="stage.expanded = !stage.expanded"
            ></i>
          </div>
          
          <div 
            v-for="col in columns" 
            :key="col.label"
            :class="['col-item', col.type ? `col-${col.type}` : 'col-dynamic']"
            :style="col.width ? { width: col.width } : { flex: col.flex || 1 }"
          >
            <template v-if="col.type === 'index'">
              {{ stage[col.prop] }}
            </template>
            <template v-else>
              {{ stage[col.prop] || '-' }}
            </template>
          </div>

          <div class="col-ops">
            <el-button 
              v-for="action in rowActions"
              :key="action.label"
              type="text" 
              size="small" 
              :class="action.class"
              @click="handleAction(action.command, stage)"
            >
              <i v-if="action.icon" :class="action.icon"></i>
              {{ action.label }}
            </el-button>
          </div>
        </div>

        <!-- 步骤子列表 - 只有展开时显示 -->
        <div v-show="stage.expanded" class="vibe-step-container">
          <draggable
            v-model="stage.children"
            :group="{ name: 'steps' }"
            handle=".drag-handle-step"
            animation="200"
            ghost-class="vibe-ghost"
            @change="(evt) => onStepChange(evt, stage)"
          >
            <div 
              v-for="step in stage.children" 
              :key="step.id" 
              class="vibe-row vibe-step-row"
              v-show="isStepVisible(step)"
            >
              <div class="col-check">
                <el-checkbox 
                  v-model="step.checked" 
                  @change="handleItemCheck('step', step)"
                  :disabled="selectionStarted && selectionType === 'stage'"
                ></el-checkbox>
                <i class="el-icon-rank drag-handle-step"></i>
                <!-- 占位符，保持对齐 -->
                <span class="expand-placeholder"></span>
              </div>

              <div 
                v-for="col in columns" 
                :key="col.label"
                :class="['col-item', col.type ? `col-${col.type}` : 'col-dynamic']"
                :style="col.width ? { width: col.width } : { flex: col.flex || 1 }"
              >
                <template v-if="col.type === 'index'">
                  <span style="font-size: 12px; color: #909399;">{{ step[col.prop] }}</span>
                </template>
                <template v-else>
                  {{ step[col.prop] || '-' }}
                </template>
              </div>

              <div class="col-ops">
                <el-button 
                  v-for="action in rowActions"
                  :key="action.label"
                  type="text" 
                  size="small" 
                  :class="action.class"
                  @click="handleAction(action.command, step)"
                >
                  <i v-if="action.icon" :class="action.icon"></i>
                  {{ action.label }}
                </el-button>
              </div>
            </div>
          </draggable>
          <!-- 添加步骤 -->
          <div v-if="showAddStep" class="vibe-add-step">
            <el-button type="text" icon="el-icon-plus" @click="addStep(stage)">添加步骤</el-button>
          </div>
        </div>
      </div>
    </draggable>

    <!-- 添加阶段 -->
    <div v-if="showAddStage" class="vibe-add-stage">
      <el-button type="text" icon="el-icon-plus" @click="addStage">添加阶段</el-button>
      <el-tooltip content="添加一个新阶段分支" placement="right">
        <i class="el-icon-info" style="color: #909399; margin-left: 5px; cursor: pointer;"></i>
      </el-tooltip>
    </div>

    <!-- 复制/移动 定位弹窗 -->
    <el-dialog
      :title="dialogTitle"
      :visible.sync="dialogVisible"
      width="800px"
      append-to-body
      custom-class="vibe-position-dialog"
    >
      <div class="vibe-dialog-tips">请选择要放置的位置</div>
      
      <div class="vibe-dialog-content">
        <!-- 弹窗内部搜索和操作 -->
        <div class="vibe-dialog-toolbar">
          <el-input
            v-model="dialogSearchQuery"
            placeholder="搜索节点"
            size="small"
            suffix-icon="el-icon-search"
            style="width: 300px"
          ></el-input>
          <div class="actions">
            <el-button type="text" size="small" @click="dialogToggleAll(false)">
              <i class="el-icon-s-fold"></i> 全部折叠
            </el-button>
            <el-button type="text" size="small" @click="dialogToggleAll(true)">
              <i class="el-icon-s-unfold"></i> 全部展开
            </el-button>
          </div>
        </div>

        <div class="vibe-dialog-list-container">
          <!-- 阶段列表 -->
          <div 
            v-for="stage in filteredDialogList" 
            :key="stage.id" 
            class="vibe-dialog-item-group"
          >
            <!-- 阶段行 -->
            <div 
              class="vibe-dialog-row vibe-dialog-stage-row"
              :class="{ 
                'is-hover': hoverNodeId === stage.id,
                'is-selected': targetNode && targetNode.id === stage.id
              }"
              @mouseenter="handleNodeMouseEnter(stage)"
              @mouseleave="handleNodeMouseLeave"
              @click="handleTargetNodeClick(stage, null)"
            >
              <div class="node-main">
                <i 
                  :class="stage.expanded ? 'el-icon-caret-bottom' : 'el-icon-caret-right'"
                  class="expand-icon"
                  @click.stop="stage.expanded = !stage.expanded"
                ></i>
                <span class="node-text">{{ stage.no }}. {{ stage.name }}</span>
                <span v-if="isSourceStage(stage)" class="current-hint">(当前所在)</span>
              </div>
              <!-- 选中锁定期或悬停时出现的控制项 -->
              <div v-if="(targetNode && targetNode.id === stage.id) || hoverNodeId === stage.id" class="node-control">
                <span class="control-label">{{ selectionType === 'step' ? '加入阶段' : '移至所选' }}</span>
                <el-radio-group v-model="positionMode" size="mini">
                  <!-- 只有移动阶段时才显示上下 -->
                  <template v-if="selectionType === 'stage'">
                    <el-radio label="below">下方</el-radio>
                    <el-radio label="above">上方</el-radio>
                  </template>
                  <!-- 如果选的是步骤，移向阶段行时仅允许“内部” -->
                  <el-radio v-else label="inside">内部</el-radio>
                </el-radio-group>
              </div>
            </div>

            <!-- 步骤列表 (仅当选择的是步骤时显示) -->
            <div v-show="stage.expanded && selectionType === 'step'" class="vibe-dialog-step-container">
              <div 
                v-for="step in stage.children" 
                :key="step.id" 
                class="vibe-dialog-row vibe-dialog-step-row"
                :class="{ 
                  'is-hover': hoverNodeId === step.id,
                  'is-selected': targetNode && targetNode.id === step.id
                }"
                @mouseenter="handleNodeMouseEnter(step, stage)"
                @mouseleave="handleNodeMouseLeave"
                @click="handleTargetNodeClick(step, stage)"
              >
                <div class="node-main">
                  <span class="node-text">{{ step.no }} {{ step.name }}</span>
                </div>
                <!-- 选中锁定期或悬停时出现的控制项 -->
                <div v-if="(targetNode && targetNode.id === step.id) || hoverNodeId === step.id" class="node-control">
                  <span class="control-label">移至所选</span>
                  <el-radio-group v-model="positionMode" size="mini">
                    <el-radio label="below">下方</el-radio>
                    <el-radio label="above">上方</el-radio>
                  </el-radio-group>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div slot="footer" class="dialog-footer">
        <el-button size="small" @click="dialogVisible = false">取消</el-button>
        <el-button 
          size="small" 
          type="primary" 
          :loading="dialogLoading"
          :disabled="!targetNode"
          @click="handleConfirmAction"
        >确定</el-button>
      </div>
    </el-dialog>
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
        { label: '序号', type: 'index', prop: 'no', width: '90px' },
        { label: '阶段/步骤名', prop: 'name', flex: 2 },
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
    },
    // 是否显示添加阶段按钮
    showAddStage: {
      type: Boolean,
      default: true
    },
    // 是否显示添加步骤按钮
    showAddStep: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      internalList: [],
      searchQuery: '', // 顶层搜索框
      checkAll: false, // 全选状态
      isIndeterminate: false, // 半选状态
      selection: [],
      lastDelta: null, // 记录最后一次变更，用于高性能回滚
      
      // 弹窗状态
      dialogVisible: false,
      dialogLoading: false,
      dialogTitle: '',
      dialogAction: '', // 'copy' or 'move'
      dialogSearchQuery: '',
      selectionType: '', // 'stage' or 'step'
      hoverNodeId: null,
      targetNode: null,
      targetParent: null,
      selectedNodes: [], // 记录当前选中的节点对象
      positionMode: 'below', // 'above' or 'below'
      dialogList: [] ,// 弹窗显示的列表快照
      
      // 内部记录选择状态
      selectionStarted: false
    };
  },
  computed: {
    filteredDialogList() {
      if (!this.dialogSearchQuery) return this.dialogList;
      const q = this.dialogSearchQuery.toLowerCase();
      return this.dialogList.filter(stage => {
        const matchStage = stage.name && stage.name.toLowerCase().includes(q);
        const matchSteps = stage.children && stage.children.some(step => step.name && step.name.toLowerCase().includes(q));
        return matchStage || matchSteps;
      });
    }
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
      // 全选只在未开始选择或选择同类型时有效，这里简化为全选 Stage
      this.internalList.forEach(stage => {
        stage.checked = val;
        // 既然选了 Stage，Step 必须清空
        if (stage.children) {
          stage.children.forEach(step => {
            step.checked = false;
          });
        }
      });
      this.isIndeterminate = false;
      this.updateUIState();
      this.updateSelection();
    },
    handleItemCheck(type, item) {
      if (item.checked) {
        // 如果选中了新类型，清除旧类型的选中
        if (this.selectionStarted && this.selectionType !== type) {
          this.clearSelectionByType(this.selectionType);
        }
        this.selectionType = type;
        this.selectionStarted = true;
      }
      
      this.updateUIState();
      this.updateSelection();
    },
    clearSelectionByType(type) {
      this.internalList.forEach(stage => {
        if (type === 'stage') {
          stage.checked = false;
        } else if (stage.children) {
          stage.children.forEach(step => {
            step.checked = false;
          });
        }
      });
    },
    updateUIState() {
      let hasSelection = false;
      let currentType = '';
      
      this.internalList.forEach(stage => {
        if (stage.checked) {
          hasSelection = true;
          currentType = 'stage';
        }
        if (stage.children) {
          stage.children.forEach(step => {
            if (step.checked) {
              hasSelection = true;
              currentType = 'step';
            }
          });
        }
      });
      
      this.selectionStarted = hasSelection;
      if (hasSelection) {
        this.selectionType = currentType;
      }
    },
    updateSelection() {
      const selected = [];
      this.internalList.forEach(stage => {
        if (stage.checked) selected.push(stage);
        if (stage.children) {
          stage.children.forEach(step => {
            if (step.checked) selected.push(step);
          });
        }
      });
      this.selection = selected;
      this.$emit('selection-change', selected);
    },
    addStage() {
      this.$emit('add-stage');
    },
    addStep(stage) {
      this.$emit('add-step', stage);
    },
    // 处理工具栏或行操作入口
    handleAction(command, payload) {
      if (command === 'copy' || command === 'move') {
        const selection = Array.isArray(payload) ? payload : [payload];
        if (!selection.length) return;
        
        this.openPositionDialog(command, selection);
      } else {
        const eventName = Array.isArray(payload) ? 'toolbar-action' : 'row-action';
        this.$emit(eventName, command, payload);
      }
    },
    openPositionDialog(command, selection) {
      this.dialogAction = command;
      this.dialogTitle = command === 'copy' ? '复制' : '移动';
      this.selectedNodes = selection;
      
      // 判断选中的类型
      const hasStage = selection.some(item => item.children !== undefined);
      this.selectionType = hasStage ? 'stage' : 'step';
      
      // 过滤掉当前选中的节点及其子节点，防止循环嵌套或逻辑混乱
      const selectionIds = selection.map(i => i.id);
      const filtered = JSON.parse(JSON.stringify(this.internalList)).filter(s => !selectionIds.includes(s.id));
      filtered.forEach(s => {
        if (s.children) {
          s.children = s.children.filter(st => !selectionIds.includes(st.id));
        }
      });

      this.dialogList = filtered;
      this.dialogVisible = true;
      this.dialogLoading = false;
      this.hoverNodeId = null;
      this.targetNode = null;
      this.positionMode = 'below';
    },
    handleNodeMouseEnter(node, parent = null) {
      this.hoverNodeId = node.id;
    },
    handleTargetNodeClick(node, parent = null) {
      this.targetNode = node;
      this.targetParent = parent;
      // 默认位置模式
      if (this.selectionType === 'step' && node.children !== undefined) {
        this.positionMode = 'inside';
      } else {
        this.positionMode = 'below';
      }
    },
    handleNodeMouseLeave() {
      this.hoverNodeId = null;
    },
    // 判断该阶段是否是当前选中步骤的父容器
    isSourceStage(stage) {
      if (this.selectionType !== 'step') return false;
      return this.selectedNodes.some(sn => {
        const parent = this.internalList.find(s => s.children && s.children.some(st => st.id === sn.id));
        return parent && parent.id === stage.id;
      });
    },
    dialogToggleAll(expanded) {
      this.dialogList.forEach(item => {
        item.expanded = expanded;
      });
    },
    handleConfirmAction() {
      if (!this.targetNode) return;
      this.dialogLoading = true;
      
      const payload = {
        action: this.dialogAction,
        selectionType: this.selectionType,
        selectionIds: this.selection.map(i => i.id),
        targetId: this.targetNode.id,
        targetParentId: this.targetParent ? this.targetParent.id : null,
        position: this.positionMode
      };
      
      // 派发给外部进行后端更新
      this.$emit(`drag-${this.dialogAction}`, payload);
    },
    // 供外部调用：后端同步成功后提交变更
    commitAction(resultData) {
      const { action, selectionType, selectionIds, targetId, targetParentId, position } = resultData;
      
      // 1. 获取选中的原始对象
      let selectedItems = [];
      if (selectionType === 'stage') {
        selectedItems = this.internalList.filter(s => selectionIds.includes(s.id));
      } else {
        this.internalList.forEach(s => {
          if (s.children) {
            const children = s.children.filter(st => selectionIds.includes(st.id));
            selectedItems.push(...children);
          }
        });
      }

      // 如果选不中，可能是因为 resultData 格式不对
      if (!selectedItems.length && action === 'move') return;

      // 2. 如果是复制，使用后端返回的新数据
      if (action === 'copy') {
        selectedItems = Array.isArray(resultData.newData) ? resultData.newData : [resultData.newData];
      }

      // 3. 如果是移动，先从原位置删除
      if (action === 'move') {
        if (selectionType === 'stage') {
          this.internalList = this.internalList.filter(s => !selectionIds.includes(s.id));
        } else {
          this.internalList.forEach(s => {
            if (s.children) {
              s.children = s.children.filter(st => !selectionIds.includes(st.id));
            }
          });
        }
      }

      // 4. 插入到新位置
      if (selectionType === 'stage') {
        const idx = this.internalList.findIndex(s => s.id === targetId);
        if (idx > -1) {
          const insertIdx = position === 'above' ? idx : idx + 1;
          this.internalList.splice(insertIdx, 0, ...selectedItems);
        }
      } else {
        const parentId = position === 'inside' ? targetId : (targetParentId || targetId);
        const parent = this.internalList.find(s => s.id === parentId);
        if (parent) {
          if (!parent.children) this.$set(parent, 'children', []);
          
          if (position === 'inside') {
            parent.children.push(...selectedItems);
          } else {
            const stepIdx = parent.children.findIndex(st => st.id === targetId);
            if (stepIdx > -1) {
              const insertIdx = position === 'above' ? stepIdx : stepIdx + 1;
              parent.children.splice(insertIdx, 0, ...selectedItems);
            } else {
              parent.children.push(...selectedItems);
            }
          }
        }
      }

      // 5. 收尾
      this.dialogVisible = false;
      this.dialogLoading = false;
      this.selection = [];
    },
    // 阶段顺序变更
    onStageChange(evt) {
      if (evt.moved) {
        this.lastDelta = {
          type: 'stage',
          item: evt.moved.element,
          oldIndex: evt.moved.oldIndex,
          newIndex: evt.moved.newIndex
        };
        this.$emit('drag-save', this.lastDelta);
      }
    },
    // 步骤顺序或容器变更
    onStepChange(evt, stage) {
      if (evt.moved) {
        this.lastDelta = {
          type: 'step',
          action: 'moved',
          item: evt.moved.element,
          oldIndex: evt.moved.oldIndex,
          newIndex: evt.moved.newIndex,
          stageId: stage.id
        };
      } else if (evt.added) {
        // 如果已经有 removed 信息，合并它
        const base = (this.lastDelta && this.lastDelta.type === 'step') ? this.lastDelta : {};
        this.lastDelta = {
          ...base,
          type: 'step',
          action: base.oldStageId ? 'cross-moved' : 'added',
          item: evt.added.element,
          newIndex: evt.added.newIndex,
          newStageId: stage.id
        };
      } else if (evt.removed) {
        // 如果已经有 added 信息，合并它
        const base = (this.lastDelta && this.lastDelta.type === 'step') ? this.lastDelta : {};
        this.lastDelta = {
          ...base,
          type: 'step',
          action: base.newStageId ? 'cross-moved' : 'removed',
          oldIndex: evt.removed.oldIndex,
          oldStageId: stage.id,
          item: base.item || evt.removed.element
        };
      }
      
      // 只有在确定是完整动作后（或者简单的 move）才派发
      const isComplete = evt.moved || (this.lastDelta && this.lastDelta.oldStageId && this.lastDelta.newStageId);
      if (isComplete) {
        this.$emit('drag-save', this.lastDelta);
      }
    },
    // 搜索辅助逻辑
    isStageVisible(stage) {
      if (!this.searchQuery) return true;
      const q = this.searchQuery.toLowerCase();
      const matchStage = stage.name && stage.name.toLowerCase().includes(q);
      const matchSteps = stage.children && stage.children.some(step => step.name && step.name.toLowerCase().includes(q));
      return matchStage || matchSteps;
    },
    isStepVisible(step) {
      if (!this.searchQuery) return true;
      return step.name && step.name.toLowerCase().includes(this.searchQuery.toLowerCase());
    },
    // 高性能回滚：基于增量（Delta）恢复，不进行全量覆盖
    rollback() {
      if (!this.lastDelta) return;

      const { type, action, oldIndex, newIndex, stageId, oldStageId, newStageId } = this.lastDelta;

      // 1. 阶段移动回滚
      if (type === 'stage') {
        const item = this.internalList.splice(newIndex, 1)[0];
        this.internalList.splice(oldIndex, 0, item);
      } 
      // 2. 步骤移动回滚
      else if (type === 'step') {
        // 同阶段内移动回滚
        if (action === 'moved') {
          const stage = this.internalList.find(s => s.id === stageId);
          if (stage && stage.children) {
            const item = stage.children.splice(newIndex, 1)[0];
            stage.children.splice(oldIndex, 0, item);
          }
        } 
        // 跨阶段移动回滚
        else {
          const oldStage = this.internalList.find(s => s.id === oldStageId);
          const newStage = this.internalList.find(s => s.id === newStageId);
          if (oldStage && newStage) {
            const item = newStage.children.splice(newIndex, 1)[0];
            oldStage.children.splice(oldIndex, 0, item);
          }
        }
      }

      this.lastDelta = null; // 处理完后清空
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
  }

  .vibe-stage-row {
    background-color: #fff;
    font-weight: 500;
  }

  .vibe-step-row {
    background-color: #fff;
    border-top: 1px dashed #f0f0f0;
  }

  .vibe-step-container {
    background-color: #fff;
  }

  .col-item {
    padding: 0 5px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  // 列宽度分配
  .col-check { 
    width: 55px; 
    padding: 0 5px; 
    flex-shrink: 0; 
    display: flex;
    align-items: center;
    justify-content: flex-start;

    /deep/ .el-checkbox {
      margin-right: 2px;
    }
  }

  .expand-placeholder {
    width: 14px; 
    display: inline-block;
  }
  
  .col-index { overflow: visible; flex-shrink: 0; }
  .col-name { flex: 2; }
  


  .col-dynamic { flex: 1; color: #909399; }
  .col-ops { width: 150px; text-align: right; flex-shrink: 0; padding: 0 5px; }

  .drag-handle-stage, .drag-handle-step {
    cursor: move;
    color: #c0c4cc;
    margin-right: 4px;
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
    padding: 10px 0 10px 75px;
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

// 弹窗样式库
.vibe-position-dialog {
  .el-dialog__body {
    padding: 20px 25px;
  }
  
  .vibe-dialog-tips {
    margin-bottom: 20px;
    font-weight: 500;
  }

  .vibe-dialog-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    padding-bottom: 15px;
    border-bottom: 1px solid #f0f0f0;
  }

  .vibe-dialog-list-container {
    max-height: 450px;
    overflow-y: auto;
    border: 1px solid #ebeef5;
    border-radius: 4px;
    padding: 10px;
  }

  .vibe-dialog-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 15px;
    border-radius: 6px;
    transition: background-color 0.15s ease-out;
    cursor: default;
    margin: 2px 0;

    &.is-hover {
      background-color: #f0f7ff;
      
      .node-text {
        color: @primary-color;
        font-weight: 600;
      }
    }

    &.is-selected {
      background-color: #ecf5ff;
      border: 1px solid @primary-color;
      box-shadow: inset 0 0 0 1px @primary-color;
      
      .node-text {
        color: @primary-color;
        font-weight: bold;
      }
    }

    &.is-disabled {
      opacity: 0.5;
      cursor: not-allowed;
      &:hover { background-color: transparent !important; }
    }

    .node-main {
      display: flex;
      align-items: center;
      flex: 1;
      
      .expand-icon {
        margin-right: 10px;
        color: #c0c4cc;
        cursor: pointer;
        width: 14px;
        text-align: center;
        transition: transform 0.2s;
        
        &:hover { color: @primary-color; }
      }
      
      .node-text {
        font-size: 14px;
        color: #303133;
        transition: all 0.2s;
      }
    }

    .node-control {
      display: flex;
      align-items: center;
      background: #fff;
      padding: 5px 14px;
      border-radius: 20px;
      border: 1px solid #dcdfe6;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      animation: vibeSlideIn 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);

      .control-label {
        margin-right: 15px;
        font-size: 12px;
        color: #606266;
        font-weight: bold;
      }
      
      /deep/ .el-radio {
        margin-right: 10px;
        &:last-child { margin-right: 0; }
        .el-radio__label { padding-left: 5px; font-size: 12px; }
      }
    }
  }

  @keyframes vibeSlideIn {
    from { opacity: 0; transform: translateX(10px); }
    to { opacity: 1; transform: translateX(0); }
  }

  .vibe-dialog-stage-row {
    font-weight: 500;
  }

  .current-hint {
    font-size: 12px;
    color: #909399;
    margin-left: 8px;
    font-weight: normal;
    font-style: italic;
  }

  .vibe-dialog-step-container {
    padding-left: 25px;
  }
  
  .vibe-dialog-step-row {
    margin-top: 2px;
    color: #606266;
  }
}
</style>
