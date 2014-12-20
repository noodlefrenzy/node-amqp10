
var WindowPolicies = {
    RefreshAtHalf : function (session) {
        if (session._sessionParams.incomingWindow < session.policy.windowQuantum) {
            session.addWindow(session.policy.windowQuantum);
        }
    },
    RefreshAtEmpty : function (link) {
        if (session._sessionParams.incomingWindow <= 0) {
            session.addWindow(session.policy.windowQuantum);
        }
    },
    DoNotRefresh : function(link) {
        // Do Nothing
    }
};

module.exports.WindowPolicies = WindowPolicies;

var CreditPolicies = {
    RefreshAtHalf : function (link) {
        if (link.linkCredit < link.policy.creditQuantum) {
            link.addCredits(link.policy.creditQuantum);
        }
    },
    RefreshAtEmpty : function (link) {
        if (link.linkCredit <= 0) {
            link.addCredits(link.policy.creditQuantum);
        }
    },
    DoNotRefresh : function(link) {
        // Do Nothing
    }
};

module.exports.CreditPolicies = CreditPolicies;
