package com.soomla.cocos2dx.store;

import android.app.Activity;
import com.soomla.store.storefront.StorefrontController;

public class StorefrontBridge {

    private static Activity mActivity;

    public static void initialize(Activity activity) {
        mActivity = activity;
    }

    static void openStore() {
        StorefrontController.getInstance().openStore(mActivity);
    }
}
