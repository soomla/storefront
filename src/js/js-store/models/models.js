define("models", ["economyModels", "storeModel"], function(EconomyModels, Store) {

    return _.extend({
        Store : Store
    }, _.pick(EconomyModels,
        "VirtualGood",
        "SingleUseGood",
        "SingleUsePack",
        "EquippableGood",
        "LifetimeGood",
        "UpgradableGood",
        "Upgrade",
        "VirtualGoodsCollection",
        "CurrencyPack",
        "Store",
        "Currency",
        "Category",
        "VirtualCurrencyCollection",
        "CurrencyPacksCollection",
        "RelationalModel"
    ));
});