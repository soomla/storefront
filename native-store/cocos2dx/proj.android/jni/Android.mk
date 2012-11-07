LOCAL_PATH := $(call my-dir)

include $(CLEAR_VARS)

LOCAL_MODULE := hellocpp_shared

LOCAL_MODULE_FILENAME := libhellocpp

LOCAL_SRC_FILES := hellocpp/main.cpp \
                   ../../Classes/AppDelegate.cpp \
                   ../../Classes/StoreBridge/JniHelpers.cpp \
                   ../../Classes/StoreBridge/cocos2dx_StoreController.cpp \
                   ../../Classes/StoreBridge/cocos2dx_StoreInventory.cpp \
				   ../../Classes/StoreBridge/cocos2dx_EventHandler.cpp \
                   ../../Classes/StoreBridge/cocos2dx_StoreInfo.cpp \
                   ../../Classes/StoreBridge/cocos2dx_Storefront.cpp \
                   ../../Classes/StoreBridge/com_soomla_cocos2dx_store_EventHandlerBridge.cpp
                   

LOCAL_C_INCLUDES := $(LOCAL_PATH)/../../Classes

LOCAL_WHOLE_STATIC_LIBRARIES := cocos2dx_static

include $(BUILD_SHARED_LIBRARY)

$(call import-module,cocos2dx)

