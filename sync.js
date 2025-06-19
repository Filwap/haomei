/**
 * 数据自动同步模块
 * 实现网站数据的自动同步功能，无需用户手动上传更新
 */

// 同步配置
const SYNC_CONFIG = {
    apiBaseUrl: 'https://memorial-site-worker.lxbtip-ddnscom.workers.dev',
    syncInterval: 60000, // 默认同步间隔：1分钟
    retryInterval: 30000, // 失败重试间隔：30秒
    maxRetries: 5, // 最大重试次数
    dbName: 'memorialSiteDB', // IndexedDB数据库名称
    dbVersion: 1, // 数据库版本
    debug: false // 调试模式
};

// 同步状态
const SYNC_STATUS = {
    IDLE: 'idle',
    SYNCING: 'syncing',
    SUCCESS: 'success',
    ERROR: 'error',
    OFFLINE: 'offline'
};

// 数据类型
const DATA_TYPES = {
    ANNIVERSARY: 'anniversaries',
    MESSAGE: 'messages',
    PHOTO: 'photos'
};

// 操作类型
const OPERATION_TYPES = {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete'
};

/**
 * 数据同步管理器类
 */
class SyncManager {
    constructor(config = {}) {
        this.config = { ...SYNC_CONFIG, ...config };
        this.db = null;
        this.syncStatus = SYNC_STATUS.IDLE;
        this.syncQueue = [];
        this.retryCount = 0;
        this.syncTimer = null;
        this.networkStatus = navigator.onLine;
        this.lastSyncTime = null;
        this.syncListeners = [];
        
        // 绑定方法
        this.handleOnline = this.handleOnline.bind(this);
        this.handleOffline = this.handleOffline.bind(this);
        
        // 初始化
        this.init();
    }
    
    /**
     * 初始化同步管理器
     */
    async init() {
        try {
            // 初始化数据库
            await this.initDatabase();
            
            // 注册网络状态监听器
            window.addEventListener('online', this.handleOnline);
            window.addEventListener('offline', this.handleOffline);
            
            // 注册Service Worker（如果浏览器支持）
            if ('serviceWorker' in navigator) {
                try {
                    const registration = await navigator.serviceWorker.register('/sync-worker.js');
                    this.log('Service Worker 注册成功:', registration);
                    
                    // 如果浏览器支持后台同步
                    if ('sync' in registration) {
                        registration.sync.register('sync-data');
                        this.log('后台同步已注册');
                    }
                } catch (error) {
                    this.log('Service Worker 注册失败:', error);
                }
            }
            
            // 开始定期同步
            this.startPeriodicSync();
            
            // 初始同步
            if (navigator.onLine) {
                this.syncAll();
            }
            
            this.log('同步管理器初始化完成');
        } catch (error) {
            console.error('同步管理器初始化失败:', error);
        }
    }
    
    /**
     * 初始化IndexedDB数据库
     */
    initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.config.dbName, this.config.dbVersion);
            
            request.onerror = (event) => {
                console.error('数据库打开失败:', event.target.error);
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.log('数据库连接成功');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 创建数据存储
                if (!db.objectStoreNames.contains(DATA_TYPES.ANNIVERSARY)) {
                    const anniversaryStore = db.createObjectStore(DATA_TYPES.ANNIVERSARY, { keyPath: 'id', autoIncrement: true });
                    anniversaryStore.createIndex('date', 'date', { unique: false });
                    anniversaryStore.createIndex('syncStatus', 'syncStatus', { unique: false });
                }
                
                if (!db.objectStoreNames.contains(DATA_TYPES.MESSAGE)) {
                    const messageStore = db.createObjectStore(DATA_TYPES.MESSAGE, { keyPath: 'id', autoIncrement: true });
                    messageStore.createIndex('timestamp', 'timestamp', { unique: false });
                    messageStore.createIndex('syncStatus', 'syncStatus', { unique: false });
                }
                
                // 创建同步队列存储
                if (!db.objectStoreNames.contains('syncQueue')) {
                    const syncQueueStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
                    syncQueueStore.createIndex('timestamp', 'timestamp', { unique: false });
                    syncQueueStore.createIndex('dataType', 'dataType', { unique: false });
                    syncQueueStore.createIndex('operationType', 'operationType', { unique: false });
                }
                
                this.log('数据库架构创建完成');
            };
        });
    }
    
    /**
     * 开始定期同步
     */
    startPeriodicSync() {
        // 清除现有定时器
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }
        
        // 设置新的定时器
        this.syncTimer = setInterval(() => {
            if (navigator.onLine && this.syncStatus !== SYNC_STATUS.SYNCING) {
                this.syncAll();
            }
        }, this.config.syncInterval);
        
        this.log(`定期同步已启动，间隔: ${this.config.syncInterval / 1000}秒`);
    }
    
    /**
     * 停止定期同步
     */
    stopPeriodicSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
            this.log('定期同步已停止');
        }
    }
    
    /**
     * 处理网络恢复在线
     */
    handleOnline() {
        this.networkStatus = true;
        this.log('网络连接已恢复');
        
        // 网络恢复后立即同步
        this.syncAll();
    }
    
    /**
     * 处理网络离线
     */
    handleOffline() {
        this.networkStatus = false;
        this.syncStatus = SYNC_STATUS.OFFLINE;
        this.log('网络连接已断开');
        
        // 通知监听器
        this.notifySyncListeners({
            status: SYNC_STATUS.OFFLINE,
            message: '网络连接已断开，数据将在网络恢复后自动同步'
        });
    }
    
    /**
     * 添加同步监听器
     * @param {Function} listener - 监听器函数
     */
    addSyncListener(listener) {
        if (typeof listener === 'function' && !this.syncListeners.includes(listener)) {
            this.syncListeners.push(listener);
        }
    }
    
    /**
     * 移除同步监听器
     * @param {Function} listener - 监听器函数
     */
    removeSyncListener(listener) {
        const index = this.syncListeners.indexOf(listener);
        if (index !== -1) {
            this.syncListeners.splice(index, 1);
        }
    }
    
    /**
     * 通知所有同步监听器
     * @param {Object} data - 通知数据
     */
    notifySyncListeners(data) {
        this.syncListeners.forEach(listener => {
            try {
                listener(data);
            } catch (error) {
                console.error('同步监听器错误:', error);
            }
        });
    }
    
    /**
     * 同步所有数据
     */
    async syncAll() {
        if (this.syncStatus === SYNC_STATUS.SYNCING) {
            this.log('同步已在进行中，跳过');
            return;
        }
        
        if (!navigator.onLine) {
            this.syncStatus = SYNC_STATUS.OFFLINE;
            this.log('网络离线，无法同步');
            return;
        }
        
        try {
            this.syncStatus = SYNC_STATUS.SYNCING;
            this.notifySyncListeners({ status: SYNC_STATUS.SYNCING, message: '正在同步数据...' });
            
            // 处理同步队列
            await this.processSyncQueue();
            
            // 同步各类数据
            await Promise.all([
                this.syncDataType(DATA_TYPES.ANNIVERSARY),
                this.syncDataType(DATA_TYPES.MESSAGE)
            ]);
            
            this.lastSyncTime = new Date();
            this.syncStatus = SYNC_STATUS.SUCCESS;
            this.retryCount = 0;
            
            this.notifySyncListeners({ 
                status: SYNC_STATUS.SUCCESS, 
                message: '数据同步成功',
                timestamp: this.lastSyncTime
            });
            
            this.log('所有数据同步完成');
        } catch (error) {
            console.error('同步失败:', error);
            this.syncStatus = SYNC_STATUS.ERROR;
            
            this.notifySyncListeners({ 
                status: SYNC_STATUS.ERROR, 
                message: `同步失败: ${error.message}`,
                error
            });
            
            // 重试逻辑
            if (this.retryCount < this.config.maxRetries) {
                this.retryCount++;
                this.log(`${this.config.retryInterval / 1000}秒后将重试同步 (${this.retryCount}/${this.config.maxRetries})`);
                
                setTimeout(() => {
                    if (navigator.onLine) {
                        this.syncAll();
                    }
                }, this.config.retryInterval);
            }
        }
    }
    
    /**
     * 同步特定类型的数据
     * @param {string} dataType - 数据类型
     */
    async syncDataType(dataType) {
        this.log(`开始同步 ${dataType}`);
        
        try {
            // 从服务器获取数据
            const serverData = await this.fetchFromServer(dataType);
            
            // 获取本地数据
            const localData = await this.getAllFromStore(dataType);
            
            // 合并数据
            const { toUpdate, toCreate } = this.mergeData(localData, serverData, dataType);
            
            // 更新本地数据库
            if (toUpdate.length > 0) {
                await this.bulkUpdateStore(dataType, toUpdate);
                this.log(`已更新 ${toUpdate.length} 条 ${dataType} 记录`);
            }
            
            // 创建新记录
            if (toCreate.length > 0) {
                await this.bulkAddToStore(dataType, toCreate);
                this.log(`已添加 ${toCreate.length} 条新的 ${dataType} 记录`);
            }
            
            return { updated: toUpdate.length, created: toCreate.length };
        } catch (error) {
            console.error(`同步 ${dataType} 失败:`, error);
            throw error;
        }
    }
    
    /**
     * 处理同步队列
     */
    async processSyncQueue() {
        try {
            // 获取所有待同步的操作
            const operations = await this.getAllFromStore('syncQueue');
            
            if (operations.length === 0) {
                this.log('同步队列为空');
                return;
            }
            
            this.log(`处理同步队列: ${operations.length} 个操作`);
            
            // 按数据类型和操作类型分组
            const groupedOps = this.groupOperations(operations);
            
            // 处理每种数据类型的操作
            for (const dataType in groupedOps) {
                const typeOps = groupedOps[dataType];
                
                // 处理创建操作
                if (typeOps.create && typeOps.create.length > 0) {
                    await this.processCreateOperations(dataType, typeOps.create);
                }
                
                // 处理更新操作
                if (typeOps.update && typeOps.update.length > 0) {
                    await this.processUpdateOperations(dataType, typeOps.update);
                }
                
                // 处理删除操作
                if (typeOps.delete && typeOps.delete.length > 0) {
                    await this.processDeleteOperations(dataType, typeOps.delete);
                }
            }
            
            // 清空已处理的同步队列
            await this.clearSyncQueue(operations.map(op => op.id));
            
            this.log('同步队列处理完成');
        } catch (error) {
            console.error('处理同步队列失败:', error);
            throw error;
        }
    }
    
    /**
     * 将操作按数据类型和操作类型分组
     * @param {Array} operations - 操作列表
     * @returns {Object} 分组后的操作
     */
    groupOperations(operations) {
        const result = {};
        
        operations.forEach(op => {
            if (!result[op.dataType]) {
                result[op.dataType] = {};
            }
            
            if (!result[op.dataType][op.operationType]) {
                result[op.dataType][op.operationType] = [];
            }
            
            result[op.dataType][op.operationType].push(op);
        });
        
        return result;
    }
    
    /**
     * 处理创建操作
     * @param {string} dataType - 数据类型
     * @param {Array} operations - 创建操作列表
     */
    async processCreateOperations(dataType, operations) {
        this.log(`处理 ${operations.length} 个 ${dataType} 创建操作`);
        
        try {
            // 提取数据项
            const items = operations.map(op => op.data);
            
            // 发送到服务器
            const results = await this.sendToServer(dataType, 'POST', items);
            
            this.log(`成功创建 ${results.length} 个 ${dataType} 项目`);
            return results;
        } catch (error) {
            console.error(`处理 ${dataType} 创建操作失败:`, error);
            throw error;
        }
    }