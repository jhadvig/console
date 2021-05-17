package server

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/openshift/console/pkg/serverutils"
	"github.com/operator-framework/kubectl-operator/pkg/action"
	"k8s.io/klog"
)

type OperatorMeta struct {
	Name      string
	Namespace string
}

func HandleOperator(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		w.Header().Set("Allow", "GET")
		serverutils.SendResponse(w, http.StatusMethodNotAllowed, serverutils.ApiError{Err: "Method unsupported, the only supported methods is GET"})
		return
	}
	operatorMeta := parseOperatorNameAndNamespace(r.URL.Path)

	cfg := &action.Configuration{}
	err := cfg.Load()
	if err != nil {
		errMsg := fmt.Sprintf("Failed to set load operator client: %v", err)
		klog.Error(errMsg)
		serverutils.SendResponse(w, http.StatusInternalServerError, serverutils.ApiError{Err: errMsg})
	}
	// We need to manually set the namespace here since the kubectl-operator
	// is setting the namespace to "default" upon calling the `cfg.Load()` method
	if len(operatorMeta.Namespace) != 0 {
		cfg.Namespace = operatorMeta.Namespace
	}

	operatorListOperands := action.NewOperatorListOperands(cfg)

	operandsList, err := operatorListOperands.Run(context.TODO(), operatorMeta.Name)
	if err != nil {
		errMsg := fmt.Sprintf("Failed to list operands: %v", err)
		klog.Error(errMsg)
		serverutils.SendResponse(w, http.StatusBadRequest, serverutils.ApiError{Err: errMsg})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	resp, err := json.Marshal(operandsList)
	if err != nil {
		errMsg := fmt.Sprintf("Failed to marshal the list operands response: %v", err)
		klog.Error(errMsg)
		serverutils.SendResponse(w, http.StatusInternalServerError, serverutils.ApiError{Err: errMsg})
	}
	w.Write(resp)
}

func parseOperatorNameAndNamespace(urlPath string) *OperatorMeta {
	nameAndNamespace := strings.SplitN(urlPath, ".", 2)
	if len(nameAndNamespace) < 2 {
		return &OperatorMeta{
			Name:      nameAndNamespace[0],
			Namespace: "",
		}
	}
	return &OperatorMeta{
		Name:      nameAndNamespace[0],
		Namespace: nameAndNamespace[1],
	}
}
