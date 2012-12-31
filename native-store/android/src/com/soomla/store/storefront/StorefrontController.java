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

import android.app.Activity;
import android.content.Intent;
import android.util.Log;
import com.soomla.store.IStoreEventHandler;
import com.soomla.store.StoreConfig;
import com.soomla.store.StoreEventHandlers;
import com.soomla.store.data.StorageManager;
import com.soomla.store.data.StoreInfo;
import com.soomla.store.data.StorefrontInfo;
import com.soomla.store.domain.data.GoogleMarketItem;
import com.soomla.store.domain.data.VirtualCurrency;
import com.soomla.store.domain.data.VirtualGood;
import com.soomla.store.exceptions.VirtualItemNotFoundException;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

public class StorefrontController implements IStoreEventHandler {

    public void openStore(Activity activity){
        String storefrontJSON = "";
        try {
            InputStream in = activity.getAssets().open("theme.json");

            byte[] buffer = new byte[in.available()];
            in.read(buffer);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            out.write(buffer);
            out.close();
            in.close();

            storefrontJSON = out.toString();
        } catch (IOException e) {
            Log.e(TAG, "Can't read JSON storefront file. Please add theme.json to your 'assets' folder.");
            return;
        }

        StorefrontInfo.getInstance().initialize(storefrontJSON);

        Intent intent = new Intent(activity.getApplicationContext(), StorefrontActivity.class);
        activity.startActivity(intent);

        StoreEventHandlers.getInstance().addEventHandler(this);
    }

    public void registerStorefrontActivity(StorefrontActivity storefrontActivity){
        this.mActivity = storefrontActivity;
    }

    public void updateCurrenciesBalanceOnScreen() {
        try {
            JSONObject jsonObject = new JSONObject();
            for(VirtualCurrency virtualCurrency : StoreInfo.getVirtualCurrencies()){
                jsonObject.put(virtualCurrency.getItemId(),
                        StorageManager.getVirtualCurrencyStorage().getBalance(virtualCurrency));
            }

            mActivity.sendToJS("currencyBalanceChanged", jsonObject.toString());

        } catch (JSONException e) {
            if (StoreConfig.debug){
                Log.d(TAG, "couldn't generate json to send balances");
            }
        }
    }

    public void updateGoodsBalanceOnScreen() {
        try {
            JSONObject jsonObject = new JSONObject();
            for (VirtualGood good : StoreInfo.getVirtualGoods()){
                JSONObject updatedValues = new JSONObject();
                updatedValues.put("balance", StorageManager.getVirtualGoodsStorage().getBalance(good));
                updatedValues.put("price", good.getCurrencyValuesAsJSONObject());
                updatedValues.put("equipped", StorageManager.getVirtualGoodsStorage().isEquipped(good));

                jsonObject.put(good.getItemId(), updatedValues);
            }

            mActivity.sendToJS("goodsUpdated", jsonObject.toString());

        } catch (JSONException e) {
            if (StoreConfig.debug){
                Log.d(TAG, "couldn't generate json to send balances");
            }
        }
    }

    public void updateManagedItemsStateOnScreen() {
        try {
            JSONObject jsonObject = new JSONObject();
            for (GoogleMarketItem googleMarketItem : StoreInfo.getGoogleManagedItems()){
                JSONObject updatedValues = new JSONObject();
                updatedValues.put("owned",
                        StorageManager.getGoogleManagedItemsStorage().googleManagedItemExists(googleMarketItem));

                jsonObject.put(googleMarketItem.getProductId(), updatedValues);
            }

            mActivity.sendToJS("nonConsumablesUpdated", jsonObject.toString());
        } catch (JSONException e) {
            Log.d(TAG, "couldn't generate json to send balances");
        }
    }

    public void updateSingleGoogleMarketItemOnScreen(String productId) {
        try {
            JSONObject jsonObject = new JSONObject();
            VirtualCurrency virtualCurrency = StoreInfo.getPackByGoogleProductId(
                    productId).getVirtualCurrency();
            jsonObject.put(virtualCurrency.getItemId(), StorageManager
                    .getVirtualCurrencyStorage().getBalance(virtualCurrency));

            mActivity.sendToJS("currencyBalanceChanged", jsonObject.toString());
        } catch (JSONException e) {
            Log.e(TAG, "couldn't generate json to return balance.");
        } catch (VirtualItemNotFoundException ex) {
            try {
                GoogleMarketItem googleMarketItem = StoreInfo.getGoogleManagedItemByProductId(productId);

                JSONObject jsonObject = new JSONObject();
                JSONObject updatedValues = new JSONObject();
                updatedValues.put("owned",
                        StorageManager.getGoogleManagedItemsStorage().googleManagedItemExists(googleMarketItem));

                jsonObject.put(googleMarketItem.getProductId(), updatedValues);

                mActivity.sendToJS("nonConsumablesUpdated", jsonObject.toString());
            }catch (VirtualItemNotFoundException e) {
                Log.e(TAG, "this is really unexpected. the currency pack (or managed item) associated with the given " +
                        "GoogleMarketItem is not found. productId: " + productId);
                StoreEventHandlers.getInstance().onUnexpectedErrorInStore();
            } catch (JSONException e) {
                Log.e(TAG, "couldn't generate json to return balance.");
            }

        }
    }

    @Override
    public void onMarketPurchase(GoogleMarketItem googleMarketItem) {
        updateSingleGoogleMarketItemOnScreen(googleMarketItem.getProductId());
    }

    @Override
    public void onMarketRefund(GoogleMarketItem googleMarketItem) {
        //To change body of implemented methods use File | Settings | File Templates.
    }

    @Override
    public void onVirtualGoodPurchased(VirtualGood good) {
        mActivity.getStoreJS().updateContentInJS();
    }

    @Override
    public void onVirtualGoodEquipped(VirtualGood good) {
        mActivity.getStoreJS().updateContentInJS();
    }

    @Override
    public void onVirtualGoodUnequipped(VirtualGood good) {
        mActivity.getStoreJS().updateContentInJS();
    }

    @Override
    public void onBillingSupported() {
        //To change body of implemented methods use File | Settings | File Templates.
    }

    @Override
    public void onBillingNotSupported() {
        mActivity.sendToJS("disableCurrencyStore", "");
    }

    @Override
    public void onMarketPurchaseProcessStarted(GoogleMarketItem googleMarketItem) {
        //To change body of implemented methods use File | Settings | File Templates.
    }

    @Override
    public void onGoodsPurchaseProcessStarted() {
        //To change body of implemented methods use File | Settings | File Templates.
    }

    @Override
    public void onClosingStore() {
        StoreEventHandlers.getInstance().removeEventHandler(this);
    }

    @Override
    public void onUnexpectedErrorInStore() {
        mActivity.sendToJS("unexpectedError", "");
    }

    @Override
    public void onOpeningStore() {
        //To change body of implemented methods use File | Settings | File Templates.
    }

    @Override
    public void onEarnedCurrencyRequested(String provider) {
        //To change body of implemented methods use File | Settings | File Templates.
    }

    /** Singleton **/

    private static StorefrontController sInstance = null;

    public static StorefrontController getInstance(){
        if (sInstance == null){
            sInstance = new StorefrontController();
        }

        return sInstance;
    }

    private StorefrontController() {
    }

    /** Private Members**/

    private static final String TAG = "SOOMLA StorefrontController";

    private StorefrontActivity mActivity;
}
