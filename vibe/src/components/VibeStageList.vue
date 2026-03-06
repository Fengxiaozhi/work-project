<template>
  <div :class="['vibe-stage-list', { 'vibe-dragging': isDragging }]" style="position: relative;">
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

    <div class="vibe-stage-list-main" ref="scrollContainer">
      <div 
        v-for="(stage, sIdx) in internalList" 
        :key="stage.id" 
        class="vibe-stage-group"
        v-show="isStageVisible(stage)"
        :data-id="stage.id"
        :data-type="'stage'"
      >
        <!-- 阶段行 -->
        <div 
          class="vibe-row vibe-stage-row"
          :class="{ 'is-checked': stage.checked }"
          :data-id="stage.id"
        >
          <div class="col-check">
            <el-checkbox 
              v-model="stage.checked" 
              @change="handleItemCheck('stage', stage)"
            ></el-checkbox>
            <i class="el-icon-rank drag-handle-stage" @mousedown="startManualDrag($event, 'stage', stage, null, sIdx)"></i>
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
            <template v-if="col.type === 'index'">{{ stage[col.prop] }}</template>
            <template v-else>{{ stage[col.prop] || '-' }}</template>
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

        <!-- 步骤子列表 -->
        <div v-show="stage.expanded" class="vibe-step-container">
          <div 
            v-for="(step, stIdx) in stage.children" 
            :key="step.id" 
            class="vibe-row vibe-step-row"
            :class="{ 'is-checked': step.checked }"
            v-show="isStepVisible(step)"
            :data-id="step.id"
            :data-type="'step'"
            :data-stage-id="stage.id"
          >
            <div class="col-check">
              <el-checkbox 
                v-model="step.checked" 
                @change="handleItemCheck('step', step)"
              ></el-checkbox>
              <i class="el-icon-rank drag-handle-step" @mousedown="startManualDrag($event, 'step', step, stage, stIdx)"></i>
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
              <template v-else>{{ step[col.prop] || '-' }}</template>
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
          <!-- 添加步骤 -->
          <div v-if="showAddStep" class="vibe-add-step">
            <el-button type="text" icon="el-icon-plus" @click="addStep(stage)">添加步骤</el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加阶段 -->
    <div v-if="showAddStage" class="vibe-add-stage">
      <el-button type="text" icon="el-icon-plus" @click="addStage">添加阶段</el-button>
      <el-tooltip content="添加一个新阶段分支" placement="right">
        <i class="el-icon-info" style="color: #909399; margin-left: 5px; cursor: pointer;"></i>
      </el-tooltip>
    </div>

    <!-- 用于自定义拖拽的浮动 Ghost 和指示线 -->
    <div v-if="isDragging" class="vibe-custom-drag-layer">
      <!-- 1. 全宽透明遮罩行 (WPS 风格) -->
      <div 
        class="vibe-floating-row-ghost"
        :style="{ 
          top: mouseIndicatorY + 'px',
          height: rowGhostHeight + 'px'
        }"
      >
        <!-- 数量气泡已移除 -->
      </div>

      <!-- 2. 激光指示线 -->
      <div 
        v-if="dropLineTop !== null"
        class="vibe-laser-indicator"
        :style="{ top: dropLineTop + 'px' }"
      >
        <div class="indicator-dot"></div>
        <div class="indicator-line"></div>
      </div>
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
export default {
  name: 'VibeStageList',
  components: { },
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
      selectionStarted: false,
      
      // 拖拽辅助
      isDragging: false,
      dragType: '', // 'stage' or 'step'
      draggingSelection: [], // 正在拖拽的多选集合
      
      // 激光线位置
      dropLineTop: null,
      targetIndex: -1,
      targetStage: null,
      targetNodeId: null, // 记录吸附的具体节点 ID
      dropPosition: 'below', // 'above' or 'below'
      
      // 自定义鼠标拖拽状态
      mouseX: 0,
      mouseY: 0,
      mouseIndicatorY: 0, // 用于行遮罩的垂直坐标
      rowGhostHeight: 40,
      
      // 记录初始位置以便同级排序补偿
      dragStartIndex: -1
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
      this.selectionStarted = false;
    },
    // --- 自定义手动拖拽引擎 ---
    startManualDrag(e, type, item, parent, index) {
      if (e.button !== 0) return; // 仅左键
      e.preventDefault();
      
      this.isDragging = true;
      this.dragType = type;
      this.targetStage = parent;
      this.dragStartIndex = index;
      this.draggingNode = item;
      
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.targetNodeId = item.id;
      this.dropPosition = 'above';
      this.dropLineTop = null; // 初始不显示线，直到触发 move 中的感应函数
      
      if (item.checked) {
        this.draggingSelection = this.selection.filter(it => {
          if (type === 'stage') return it.children !== undefined;
          return it.children === undefined;
        });
      } else {
        this.draggingSelection = [item];
      }

      window.addEventListener('mousemove', this.handleManualMove);
      window.addEventListener('mouseup', this.handleManualUp);
      
      const container = this.$refs.scrollContainer;
      if (container) {
        container.addEventListener('scroll', this.handleManualMove);
      }
    },
    handleManualMove(e) {
      if (!this.isDragging) return;
      
      // 如果是通过 scroll 事件触发的，e 为 Event 而非 MouseEvent
      // 我们需要使用缓存的鼠标 clientY
      const clientY = e.clientY !== undefined ? e.clientY : this._lastClientY;
      const clientX = e.clientX !== undefined ? e.clientX : this._lastClientX;
      
      this.mouseX = clientX;
      this.mouseY = clientY;
      this._lastClientY = clientY;
      this._lastClientX = clientX;

      const rootRect = this.$el.getBoundingClientRect();
      this.mouseIndicatorY = clientY - rootRect.top;

      this.calculateDropPosition(clientY);
      this.handleAutoScroll(clientY);
    },
    calculateDropPosition(y) {
      const container = this.$refs.scrollContainer;
      if (!container) return;
      
      const rootRect = this.$el.getBoundingClientRect();
      let bestDist = Infinity;
      let bestPos = { top: 0, index: 0, stage: null, nodeId: null, pos: 'above' };

      // 1. 如果拖动的是阶段
      if (this.dragType === 'stage') {
        const groups = container.querySelectorAll('.vibe-stage-group');
        groups.forEach(group => {
          const rect = group.getBoundingClientRect();
          const nodeId = group.dataset.id;
          const mid = rect.top + rect.height / 2;

          // 使用“中点判定法”：如果在组内，根据上半截或下半截决定
          if (y >= rect.top && y <= rect.bottom) {
            const pos = y < mid ? 'above' : 'below';
            bestDist = 0; // 容器内强制命中
            bestPos = { 
              top: (pos === 'above' ? rect.top : rect.bottom) - rootRect.top, 
              index: this.getStageIndex(group, pos),
              nodeId, pos
            };
          } else {
            // 不在组内，则寻找最近的边界
            const dTop = Math.abs(y - rect.top);
            if (dTop < bestDist) {
              bestDist = dTop;
              bestPos = { top: rect.top - rootRect.top, index: this.getStageIndex(group, 'above'), nodeId, pos: 'above' };
            }
            const dBottom = Math.abs(y - rect.bottom);
            if (dBottom < bestDist) {
              bestDist = dBottom;
              bestPos = { top: rect.bottom - rootRect.top, index: this.getStageIndex(group, 'below'), nodeId, pos: 'below' };
            }
          }
        });
      } else {
        // 2. 如果拖动的是步骤
        const rows = container.querySelectorAll('.vibe-row');
        rows.forEach(row => {
          const rect = row.getBoundingClientRect();
          const nodeId = row.dataset.id;
          const mid = rect.top + rect.height / 2;

          if (y >= rect.top && y <= rect.bottom) {
            const pos = y < mid ? 'above' : 'below';
            bestDist = 0;
            bestPos = {
              top: (pos === 'above' ? rect.top : rect.bottom) - rootRect.top,
              index: this.getRowIndex(row, pos),
              stage: this.getRowParent(row),
              nodeId, pos
            };
          } else {
            const dTop = Math.abs(y - rect.top);
            if (dTop < bestDist) {
              bestDist = dTop;
              bestPos = { top: rect.top - rootRect.top, index: this.getRowIndex(row, 'above'), stage: this.getRowParent(row), nodeId, pos: 'above' };
            }
            const dBottom = Math.abs(y - rect.bottom);
            if (dBottom < bestDist) {
              bestDist = dBottom;
              bestPos = { top: rect.bottom - rootRect.top, index: this.getRowIndex(row, 'below'), stage: this.getRowParent(row), nodeId, pos: 'below' };
            }
          }
        });
      }

      if (bestDist < 50) {
        this.dropLineTop = bestPos.top;
        this.targetIndex = bestPos.index;
        this.targetStage = bestPos.stage;
        this.targetNodeId = bestPos.nodeId;
        this.dropPosition = bestPos.pos;
      }
    },
    getStageIndex(group, pos) {
      const allGroups = Array.from(this.$refs.scrollContainer.querySelectorAll('.vibe-stage-group'));
      const idx = allGroups.indexOf(group);
      return pos === 'above' ? idx : idx + 1;
    },
    getRowIndex(row, pos) {
      // 阶段头部行，没有具体的步骤索引
      if (row.classList.contains('vibe-stage-row')) return -1;
      
      const container = row.closest('.vibe-stage-group')?.querySelector('.vibe-step-container');
      if (!container) return -1;
      
      const allRows = Array.from(container.querySelectorAll('.vibe-step-row'));
      const idx = allRows.indexOf(row);
      return pos === 'above' ? idx : idx + 1;
    },
    getRowParent(row) {
      const stageGroup = row.closest('.vibe-stage-group');
      if (!stageGroup) return null;
      const stageId = stageGroup.dataset.id;
      return this.internalList.find(s => s.id == stageId);
    },
    handleManualUp(e) {
      window.removeEventListener('mousemove', this.handleManualMove);
      window.removeEventListener('mouseup', this.handleManualUp);
      
      const container = this.$refs.scrollContainer;
      if (container) {
        container.removeEventListener('scroll', this.handleManualMove);
      }
      
      if (!this.isDragging) return;
      
      // 如果没有显示指示线（没触发吸附），则不执行移动，直接重置
      if (this.dropLineTop === null) {
        this.resetDragState();
        return;
      }
      
      this.executeDrop();
      this.resetDragState();
    },
    executeDrop() {
      const type = this.dragType;
      const selectedItems = this.draggingSelection;
      const selectionIds = selectedItems.map(i => i.id);
      const stage = this.targetStage;

      if (type === 'stage') {
        const originalList = [...this.internalList];
        const targetRawIdx = originalList.findIndex(s => s.id == this.targetNodeId);
        
        if (targetRawIdx === -1) {
          // 如果真的没找到目标（比如在所有项之外），默认逻辑
          this.internalList = this.internalList.filter(item => !selectionIds.includes(item.id));
          this.internalList.push(...selectedItems);
          this.$emit('drag-save', { type: 'stage', item: selectedItems[0], newIndex: this.internalList.length - selectedItems.length });
        } else {
          this.internalList = this.internalList.filter(item => !selectionIds.includes(item.id));
          let targetInsertionIdx = this.dropPosition === 'above' ? targetRawIdx : targetRawIdx + 1;
          const movedBeforeTarget = originalList.slice(0, targetInsertionIdx).filter(s => selectionIds.includes(s.id)).length;
          let finalIdx = targetInsertionIdx - movedBeforeTarget;

          finalIdx = Math.max(0, Math.min(finalIdx, this.internalList.length));
          this.internalList.splice(finalIdx, 0, ...selectedItems);
          this.$emit('drag-save', { type: 'stage', item: selectedItems[0], newIndex: finalIdx });
        }
      } else {
        if (!stage) return;
        const fromStage = this.internalList.find(s => s.children && s.children.some(st => st.id == selectedItems[0].id));
        const isSameStage = fromStage && fromStage.id == stage.id;
        
        if (!stage.children) this.$set(stage, 'children', []);
        const originalChildren = [...stage.children];
        const targetRawIdx = originalChildren.findIndex(st => st.id == this.targetNodeId);
        
        // 1. 从原阶段移除
        if (fromStage) fromStage.children = fromStage.children.filter(st => !selectionIds.includes(st.id));
        
        // 3. 计算插入位置
        let finalIdx = 0;
        if (targetRawIdx !== -1) {
          let targetInsertionIdx = this.dropPosition === 'above' ? targetRawIdx : targetRawIdx + 1;
          finalIdx = targetInsertionIdx;
          if (isSameStage) {
            const movedBeforeTarget = originalChildren.slice(0, targetInsertionIdx).filter(st => selectionIds.includes(st.id)).length;
            finalIdx = targetInsertionIdx - movedBeforeTarget;
          }
        } else {
          // 如果目标不在 children 里，但确实有 targetNodeId
          // 检查 targetNodeId 是否就是当前 stage 的 ID（拖到了阶段头部）
          if (this.targetNodeId == stage.id && this.dropPosition === 'above') {
            finalIdx = 0;
          } else {
            finalIdx = stage.children.length;
          }
        }

        finalIdx = Math.max(0, Math.min(finalIdx, stage.children.length));
        stage.children.splice(finalIdx, 0, ...selectedItems);
        this.$emit('drag-save', { 
          type: 'step', 
          item: selectedItems[0], 
          newIndex: finalIdx, 
          stageId: stage.id,
          oldStageId: fromStage ? fromStage.id : null
        });
      }
    },
    handleAutoScroll(y) {
      const container = this.$refs.scrollContainer;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const edge = 50;
      if (y < rect.top + edge) {
        container.scrollTop -= 10;
      } else if (y > rect.bottom - edge) {
        container.scrollTop += 10;
      }
    },
    resetDragState() {
      this.isDragging = false;
      this.dropLineTop = null;
      this.draggingSelection = [];
      this.targetIndex = -1;
      this.targetStage = null;
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

  // 自定义拖拽图层
  .vibe-custom-drag-layer {
    position: absolute; // 相对于 vibe-stage-list 定位，以支持滚动区域计算
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 10000;
  }

  // 全宽行遮罩 (WPS 风格)
  .vibe-floating-row-ghost {
    position: absolute;
    left: 0;
    right: 0;
    background: rgba(64, 158, 255, 0.15) !important; // 淡蓝色全宽背景
    border-top: 1px solid rgba(64, 158, 255, 0.3);
    border-bottom: 1px solid rgba(64, 158, 255, 0.3);
    z-index: 10001;
    transform: translateY(-50%); // 居中于鼠标
    pointer-events: none;
  }

  // 数量气泡已移除
  
  // 激光指示线
  .vibe-laser-indicator {
    position: absolute;
    left: 0;
    right: 0;
    height: 0;
    pointer-events: none;
    z-index: 9999;

    .indicator-line {
      height: 2px;
      background: @primary-color;
      width: 100%;
      box-shadow: 0 0 10px rgba(64, 158, 255, 1);
      position: absolute;
      top: -1px;
    }

    .indicator-dot {
      position: absolute;
      left: 1px; 
      top: -6.5px;
      width: 13px;
      height: 13px;
      background: @primary-color;
      border: 2px solid #fff;
      border-radius: 50%;
      box-shadow: 0 0 6px rgba(64, 158, 255, 1);
    }
  }

  // 正在拖拽时的全局样式
  &.vibe-dragging {
    cursor: grabbing !important;
    user-select: none;
    
    .vibe-row {
      &.is-checked {
        opacity: 0.4;
        background-color: #f0f7ff !important;
      }
    }
  }

  .vibe-stage-list-main {
    max-height: calc(100vh - 200px);
    overflow-y: auto;
    position: relative;
    padding-bottom: 50px; // 给底部留出拖拽吸附空间
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
