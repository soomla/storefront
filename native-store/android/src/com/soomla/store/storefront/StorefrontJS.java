/*
 * Copyright (C) 2012 Soomla Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.soomla.store.storefront;

import android.content.res.AssetFileDescriptor;
import android.media.MediaPlayer;
import android.os.Handler;
import android.util.Log;
import com.soomla.store.StoreConfig;
import com.soomla.store.StoreController;
import com.soomla.store.data.StorageManager;
import com.soomla.store.data.StoreInfo;
import com.soomla.store.data.StorefrontInfo;
import com.soomla.store.domain.data.VirtualCurrency;
import com.soomla.store.domain.data.VirtualGood;
import com.soomla.store.exceptions.InsufficientFundsException;
import com.soomla.store.exceptions.NotEnoughGoodsException;
import com.soomla.store.exceptions.VirtualItemNotFoundException;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Iterator;

/**
 * This class is the main place to invoke store actions.
 * SOOMLA's android sdk uses this class as an interface between the
 * webview's JS and the native code.
 */
public class StorefrontJS{

    /** Constructor
     *
     * @param mHandler is a Handler used to post messages to the UI thread.
     * @param mActivity is the main {@link StorefrontActivity}.
     */
    public StorefrontJS(Handler mHandler, StorefrontActivity mActivity) {
        this.mHandler = mHandler;
        this.mActivity = mActivity;
    }

    /**
     * The user wants to buy a virtual currency pack.
     * @param productId is the product id of the pack.
     */
    public void wantsToBuyMarketItem(String productId){
        if (StoreConfig.debug){
            Log.d(TAG, "wantsToBuyMarketItem " + productId);
        }

        try {
            StoreController.getInstance().buyGoogleMarketItem(productId);
        } catch (VirtualItemNotFoundException e) {
            mActivity.sendToJS("unexpectedError", "");
        }
    }

    /**
     * The user wants to buy a virtual good.
     * @param itemId is the item id of the virtual good.
     */
    public void wantsToBuyVirtualGoods(String itemId) {
        if (StoreConfig.debug){
            Log.d(TAG, "wantsToBuyVirtualGoods " + itemId);
        }

        try {
            StoreController.getInstance().buyVirtualGood(itemId);
        } catch (InsufficientFundsException e) {
            if (StoreConfig.debug){
                Log.d(TAG, e.getMessage());
            }

            mActivity.sendToJS("insufficientFunds", "'" + e.getItemId() + "'");
        } catch (VirtualItemNotFoundException e) {
            mActivity.sendToJS("unexpectedError", "");
            Log.e(TAG, "Couldn't find a VirtualGood with itemId: " + itemId + ". Purchase is cancelled.");
        }
    }

    /**
     * The user wants to leave the store.
     * Clicked on "close" button.
     */
    public void wantsToLeaveStore(){
        Log.d(TAG, "wantsToLeaveStore");
        mHandler.post(new Runnable() {
            @Override
            public void run() {
                mActivity.finish();
            }
        });
    }

    /**
     * The store's storefront is ready to receive calls.
     */
    public void uiReady(){
        if (StoreConfig.debug){
            Log.d(TAG, "uiReady");
        }
        mActivity.JSuiReady();

        try {
            JSONObject storeJSONObject = StoreInfo.toJSONObject();
            JSONObject storefrontJSONObject = new JSONObject(StorefrontInfo.getInstance().getStorefrontJSON());
            Iterator<?> keys = storefrontJSONObject.keys();
            while(keys.hasNext())
            {
                String key = (String)keys.next();
                storeJSONObject.put(key, storefrontJSONObject.get(key));
            }

            if (StoreConfig.debug){
                Log.d(TAG, "initializing JS with JSON: " + storeJSONObject.toString());
            }

            mActivity.sendToJS("initialize", storeJSONObject.toString());
        } catch (JSONException e) {
            if (StoreConfig.debug){
                Log.d(TAG, "can't generate/parse json object to initialize store.");
            }
        }

        updateContentInJS();
    }

    /**
     * The store is initialized.
     */
    public void storeInitialized(){
        if (StoreConfig.debug){
            Log.d(TAG, "storeInitialized");
        }
        mActivity.loadWebView();
    }

    public void wantsToEquipGoods(String itemId){
        if (StoreConfig.debug){
            Log.d(TAG, "wantsToEquipGoods");
        }

        try {
            StoreController.getInstance().equipVirtualGood(itemId);
        } catch (VirtualItemNotFoundException e) {
            mActivity.sendToJS("unexpectedError", "");
            Log.e(TAG, "Couldn't find a VirtualGood with itemId: " + itemId + ". Purchase is cancelled.");
        } catch (NotEnoughGoodsException e) {
            if (StoreConfig.debug){
                Log.d(TAG, e.getMessage());
            }

            mActivity.sendToJS("notEnoughGoods", "'" + itemId + "'");
        }
    }

    public void wantsToUnequipGoods(String itemId){
        if (StoreConfig.debug){
            Log.d(TAG, "wantsToUnequipGoods");
        }

        try {
            StoreController.getInstance().unequipVirtualGood(itemId);
        } catch (VirtualItemNotFoundException e) {
            mActivity.sendToJS("unexpectedError", "");
            Log.e(TAG, "Couldn't find a VirtualGood with itemId: " + itemId + ". Purchase is cancelled.");
        }
    }

    public void playPop() {
        if (StoreConfig.debug){
            Log.d(TAG, "playPop");
        }

        try {
            MediaPlayer mp = new MediaPlayer();
            AssetFileDescriptor descriptor = mActivity.getAssets().openFd( "theme/sounds/pop.mp3" );
            mp.setDataSource( descriptor.getFileDescriptor(), descriptor.getStartOffset(),  descriptor.getLength() );
            descriptor.close();
            mp.prepare();
            mp.start();
        } catch (Exception e) {
            Log.e(TAG, "Couldn't play pop. error: " + e.getMessage());
        }
    }
	
    public void requestEarnedCurrency(String provider) {
        if (StoreConfig.debug) {
            Log.d(TAG, "requestEarnedCurrency");
        }

		// if (provider.equals("tapjoy")) {
		// 	SoomlaTapjoy.getInstance().showOfferWall();
		// }
    }

    /**
     * Sends the virtual currency and virtual goods updated data to the webview's JS.
     */
    public void updateContentInJS(){
		StorefrontController.getInstance().updateCurrenciesBalanceOnScreen();
		StorefrontController.getInstance().updateGoodsBalanceOnScreen();
		StorefrontController.getInstance().updateManagedItemsStateOnScreen();
    }


    /** Private members **/

    private static final String TAG = "SOOMLA StorefrontJS";

    private Handler            mHandler;
    private StorefrontActivity mActivity;
}
